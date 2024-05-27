"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIndexedData = exports.updateIndexedData = exports.addDataToIndex = exports.getIndexedData = exports.getDocumentCount = exports.createIndex = exports.checkExistingIndex = exports.checkConnection = exports.elasticSearchClient = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const config_1 = require("./config");
exports.elasticSearchClient = new elasticsearch_1.Client({
    node: `${config_1.ELASTIC_SEARCH_URL}`
});
function checkConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        let isConnected = false;
        while (!isConnected) {
            (0, config_1.logger)("elasticsearch.ts - checkConnection()").info("GigService connecting to Elasticsearch...");
            try {
                const health = yield exports.elasticSearchClient.cluster.health({});
                (0, config_1.logger)("elasticsearch.ts - checkConnection()").info(`GigService Elasticsearch health status - ${health.status}`);
                isConnected = true;
            }
            catch (error) {
                (0, config_1.logger)("elasticsearch.ts - checkConnection()").error("Connection to Elasticsearch failed. Retrying...");
                (0, config_1.logger)("elasticsearch.ts - checkConnection()").error("GigService checkConnection() method error:", error);
            }
        }
    });
}
exports.checkConnection = checkConnection;
function checkExistingIndex(indexName) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield exports.elasticSearchClient.indices.exists({
            index: indexName
        });
        return result;
    });
}
exports.checkExistingIndex = checkExistingIndex;
function createIndex(indexName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const existingIndex = yield checkExistingIndex(indexName);
            if (existingIndex) {
                (0, config_1.logger)("elasticsearch.ts - createIndex()").info(`Index ${indexName} already exist in Elasticsearch.`);
            }
            else {
                yield exports.elasticSearchClient.indices.create({ index: indexName });
                // refreshing document
                // so we can access the document right after creating an index
                yield exports.elasticSearchClient.indices.refresh({ index: indexName });
                (0, config_1.logger)("elasticsearch.ts - createIndex()").info(`Created index ${indexName} in Elasticsearch`);
            }
        }
        catch (error) {
            (0, config_1.logger)("elasticsearch.ts - createIndex()").error(`An error occured while creating the index ${indexName}`);
            (0, config_1.logger)("elasticsearch.ts - createIndex()").error("GigService createIndex() method error:", error);
        }
    });
}
exports.createIndex = createIndex;
function getDocumentCount(index) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.elasticSearchClient.count({ index });
            return result.count;
        }
        catch (error) {
            (0, config_1.logger)("elasticsearc.ts - getDocumentCount()").error("GigService elasticsearch getDocumentCount() method error:", error);
            return 0;
        }
    });
}
exports.getDocumentCount = getDocumentCount;
function getIndexedData(index, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.elasticSearchClient.get({ index, id: itemId });
            return result === null || result === void 0 ? void 0 : result._source;
        }
        catch (error) {
            (0, config_1.logger)("elasticsearch.ts - getIndexedData()").error("GigService elasticsearch getIndexedData() method error:", error);
            return {};
        }
    });
}
exports.getIndexedData = getIndexedData;
function addDataToIndex(index, itemId, document) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.elasticSearchClient.index({ index, id: itemId, document });
        }
        catch (error) {
            (0, config_1.logger)("elasticsearch.ts - addDataToIndex()").error("GigService elasticsearch addDataToIndex() method error:", error);
        }
    });
}
exports.addDataToIndex = addDataToIndex;
function updateIndexedData(index, itemId, document) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.elasticSearchClient.update({ index, id: itemId, doc: document });
        }
        catch (error) {
            (0, config_1.logger)("elasticsearch.ts - updateIndexedData()").error("GigService elasticsearch updateIndexedData() method error:", error);
        }
    });
}
exports.updateIndexedData = updateIndexedData;
function deleteIndexedData(index, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.elasticSearchClient.delete({ index, id: itemId });
        }
        catch (error) {
            (0, config_1.logger)("elasticsearch.ts - deleteIndexedData()").error("GigService elasticsearch deleteIndexedData() method error:", error);
        }
    });
}
exports.deleteIndexedData = deleteIndexedData;
//# sourceMappingURL=elasticsearch.js.map