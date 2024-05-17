import { Client } from "@elastic/elasticsearch";
import { ISellerGig } from "@Akihira77/jobber-shared";
import { ClusterHealthResponse } from "@elastic/elasticsearch/lib/api/types";
import { ELASTIC_SEARCH_URL, logger } from "@gig/config";

export const elasticSearchClient = new Client({
    node: `${ELASTIC_SEARCH_URL}`
});

export async function checkConnection(): Promise<void> {
    let isConnected = false;
    while (!isConnected) {
        logger("elasticsearch.ts - checkConnection()").info(
            "GigService connecting to Elasticsearch..."
        );
        try {
            const health: ClusterHealthResponse =
                await elasticSearchClient.cluster.health({});

            logger("elasticsearch.ts - checkConnection()").info(
                `GigService Elasticsearch health status - ${health.status}`
            );
            isConnected = true;
        } catch (error) {
            logger("elasticsearch.ts - checkConnection()").error(
                "Connection to Elasticsearch failed. Retrying..."
            );
            logger("elasticsearch.ts - checkConnection()").error(
                "GigService checkConnection() method error:",
                error
            );
        }
    }
}

export async function checkExistingIndex(indexName: string): Promise<boolean> {
    const result: boolean = await elasticSearchClient.indices.exists({
        index: indexName
    });

    return result;
}

export async function createIndex(indexName: string): Promise<void> {
    try {
        const existingIndex: boolean = await checkExistingIndex(indexName);
        if (existingIndex) {
            logger("elasticsearch.ts - createIndex()").info(
                `Index ${indexName} already exist in Elasticsearch.`
            );
        } else {
            await elasticSearchClient.indices.create({ index: indexName });

            // refreshing document
            // so we can access the document right after creating an index
            await elasticSearchClient.indices.refresh({ index: indexName });

            logger("elasticsearch.ts - createIndex()").info(
                `Created index ${indexName} in Elasticsearch`
            );
        }
    } catch (error) {
        logger("elasticsearch.ts - createIndex()").error(
            `An error occured while creating the index ${indexName}`
        );
        logger("elasticsearch.ts - createIndex()").error(
            "GigService createIndex() method error:",
            error
        );
    }
}

export async function getDocumentCount(index: string): Promise<number> {
    try {
        const result = await elasticSearchClient.count({ index });

        return result.count;
    } catch (error) {
        logger("elasticsearc.ts - getDocumentCount()").error(
            "GigService elasticsearch getDocumentCount() method error:",
            error
        );
        return 0;
    }
}

export async function getIndexedData(
    index: string,
    itemId: string
): Promise<ISellerGig> {
    try {
        const result = await elasticSearchClient.get({ index, id: itemId });

        return result?._source as ISellerGig;
    } catch (error) {
        logger("elasticsearch.ts - getIndexedData()").error(
            "GigService elasticsearch getIndexedData() method error:",
            error
        );
        return {} as ISellerGig;
    }
}

export async function addDataToIndex(
    index: string,
    itemId: string,
    document: ISellerGig
): Promise<void> {
    try {
        await elasticSearchClient.index({ index, id: itemId, document });
    } catch (error) {
        logger("elasticsearch.ts - addDataToIndex()").error(
            "GigService elasticsearch addDataToIndex() method error:",
            error
        );
    }
}

export async function updateIndexedData(
    index: string,
    itemId: string,
    document: unknown
): Promise<void> {
    try {
        await elasticSearchClient.update({ index, id: itemId, doc: document });
    } catch (error) {
        logger("elasticsearch.ts - updateIndexedData()").error(
            "GigService elasticsearch updateIndexedData() method error:",
            error
        );
    }
}

export async function deleteIndexedData(
    index: string,
    itemId: string
): Promise<void> {
    try {
        await elasticSearchClient.delete({ index, id: itemId });
    } catch (error) {
        logger("elasticsearch.ts - deleteIndexedData()").error(
            "GigService elasticsearch deleteIndexedData() method error:",
            error
        );
    }
}
