import {
    IHitsTotal,
    IPaginateProps,
    IQueryList,
    ISearchResult,
    winstonLogger
} from "@Akihira77/jobber-shared";
import { elasticSearchClient } from "@gig/elasticsearch";
import { SearchResponse } from "@elastic/elasticsearch/lib/api/types";
import { Logger } from "winston";
import { ELASTIC_SEARCH_URL } from "@gig/config";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigSearchService",
    "debug"
);

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

    try {
        console.log(queryList);
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
    } catch (error) {
        log.error("GigService gigsSearchBySellerId() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function gigsSearch(
    searchQuery: string,
    paginate: IPaginateProps,
    deliveryTime?: string,
    min?: string,
    max?: string
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

    if (deliveryTime !== "undefined") {
        queryList.push({
            query_string: {
                fields: ["expectedDelivery"],
                query: `*${deliveryTime}*`
            }
        });
    }

    console.log(`min ${min}`);
    console.log(`max ${max}`);
    if (min !== "undefined" && max !== "undefined") {
        queryList.push({
            range: {
                price: {
                    gte: min,
                    lte: max
                }
            }
        });
    }

    queryList.forEach((query) => {
        console.log({ ...query });
    });

    try {
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
    } catch (error) {
        log.error("GigService gigsSearch() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function gigsSearchByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    try {
        const result: SearchResponse = await elasticSearchClient.search({
            index: "gigs",
            size: 10,
            query: {
                bool: {
                    must: [
                        {
                            query_string: {
                                fields: ["categories"],
                                query: `*${searchQuery}*`
                            }
                        },
                        {
                            term: {
                                active: true
                            }
                        }
                    ]
                }
            }
        });

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        log.error("GigService gigsSearchByCategory() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function getMoreGigsLikeThis(
    gigId: string
): Promise<ISearchResult> {
    try {
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
    } catch (error) {
        log.error("GigService getMoreGigsLikeThis() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function getTopRatedGigsByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    try {
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
    } catch (error) {
        log.error(
            "GigService getTopRatedGigsByCategory() method error:",
            error
        );
        return { total: 0, hits: [] };
    }
}
