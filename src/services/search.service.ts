import {
    IHitsTotal,
    IPaginateProps,
    IQueryList,
    ISearchResult
} from "@Akihira77/jobber-shared";
import { elasticSearchClient } from "@gig/elasticsearch";
import { SearchResponse } from "@elastic/elasticsearch/lib/api/types";

export async function gigsSearchBySellerId(
    searchQuery: string,
    active: boolean
): Promise<ISearchResult> {
    // try it on elasticsearch dev tools
    const queryList: IQueryList[] = [
        {
            query_string: {
                fields: ["sellerId"],
                query: `*${searchQuery}*`
            }
        },
        {
            term: {
                active
            }
        }
    ];

    const result: SearchResponse = await elasticSearchClient.search({
        index: "gigs",
        query: {
            bool: {
                must: queryList
            }
        }
    });

    const total: IHitsTotal = result.hits.total as IHitsTotal;
    const hits = result.hits.hits;

    return { total: total.value, hits };
}

export async function gigsSearch(
    searchQuery: string,
    paginate: IPaginateProps,
    deliveryTime?: string,
    min?: number,
    max?: number
): Promise<ISearchResult> {
    const { from, size, type } = paginate;
    // try it on elasticsearch dev tools
    const queryList: IQueryList[] = [
        {
            query_string: {
                fields: [
                    "username",
                    "title",
                    "description",
                    "basicDescription",
                    "basicTitle",
                    "categories",
                    "subCategories",
                    "tags"
                ],
                query: `*${searchQuery}*`
            }
        },
        {
            term: {
                active: true
            }
        }
    ];

    if (!deliveryTime) {
        queryList.push({
            query_string: {
                fields: ["expectedDelivery"],
                query: `*${deliveryTime}*`
            }
        });
    }

    if (!isNaN(parseInt(`${min}`)) && !isNaN(parseInt(`${max}`))) {
        queryList.push({
            range: {
                price: {
                    gte: min,
                    lte: max
                }
            }
        });
    }

    const result: SearchResponse = await elasticSearchClient.search({
        index: "gigs",
        size,
        query: {
            bool: {
                must: queryList
            }
        },
        sort: [
            {
                sortId: type === "forward" ? "asc" : "desc"
            }
        ],
        // startFrom for pagination
        ...(from !== "0" && { search_after: [from] })
    });

    const total: IHitsTotal = result.hits.total as IHitsTotal;
    const hits = result.hits.hits;

    return { total: total.value, hits };
}

export async function gigsSearchByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    const result: SearchResponse = await elasticSearchClient.search({
        index: "gigs",
        size: 10,
        query: {
            bool: {
                must: {
                    query_string: {
                        fields: ["categories"],
                        query: `*${searchQuery}*`
                    }
                }
            },
            term: {
                active: true
            }
        }
    });

    const total: IHitsTotal = result.hits.total as IHitsTotal;
    const hits = result.hits.hits;

    return { total: total.value, hits };
}

export async function getMoreGigsLikeThis(
    gigId: string
): Promise<ISearchResult> {
    const result: SearchResponse = await elasticSearchClient.search({
        index: "gigs",
        size: 5,
        query: {
            more_like_this: {
                fields: [
                    "username",
                    "title",
                    "description",
                    "basicDescription",
                    "basicTitle",
                    "categories",
                    "subCategories",
                    "tags"
                ],
                like: [
                    {
                        _index: "gigs",
                        _id: gigId
                    }
                ]
            }
        }
    });

    const total: IHitsTotal = result.hits.total as IHitsTotal;
    const hits = result.hits.hits;

    return { total: total.value, hits };
}

export async function getTopRatedGigsByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    const result: SearchResponse = await elasticSearchClient.search({
        index: "gigs",
        size: 10,
        query: {
            bool: {
                filter: {
                    script: {
                        script: {
                            source: "doc['ratingSum'].value != 0 && (doc['ratingSum'].value / doc['ratingsCount'].value == params['threshold'])",
                            lang: "painless",
                            params: {
                                threshold: 5
                            }
                        }
                    }
                },
                must: [
                    {
                        query_string: {
                            fields: ["categories"],
                            query: `*${searchQuery}*`
                        }
                    }
                ]
            }
        }
    });

    const total: IHitsTotal = result.hits.total as IHitsTotal;
    const hits = result.hits.hits;

    return { total: total.value, hits };
}
