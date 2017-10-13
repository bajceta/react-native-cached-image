'use strict';

const _ = require('lodash');
const fs = require('fs');

const fsUtils = require('./utils/fsUtils');
const pathUtils = require('./utils/pathUtils');
const MemoryCache = require('react-native-clcasher/MemoryCache').default;

module.exports = (defaultOptions = {}, fs = fsUtils, path = pathUtils) => {

    const defaultDefaultOptions = {
        headers: {},
        ttl: 60 * 60 * 24 * 14, // 2 weeks
        useQueryParamsInCacheKey: false,
        cacheLocation: fs.getCacheDir(),
        allowSelfSignedSSL: false,
        urlCache: MemoryCache,
    };

    // apply default options
    _.defaults(defaultOptions, defaultDefaultOptions);

    function isCacheable(url) {
        return _.isString(url) && (_.startsWith(url.toLowerCase(), 'http://') || _.startsWith(url.toLowerCase(), 'https://'));
    }

    function cacheUrl(url, options, getCachedFile) {
        if (!isCacheable(url)) {
            return Promise.reject(new Error('Url is not cacheable'));
        }
        // allow CachedImage to provide custom options
        _.defaults(options, defaultOptions);
        // cacheableUrl contains only the needed query params
        const cacheableUrl = path.getCacheableUrl(url, options.useQueryParamsInCacheKey);
        const filePath = path.getImageFilePath(cacheableUrl, options.cacheLocation);
        
        return fs.access(filePath)
          .then(() => filePath)
          .catch(() => getCachedFile(filePath)
                   .then(() => filePath))
    }

    return {

        /**
         * download an image and cache the result according to the given options
         * @param url
         * @param options
         * @returns {Promise}
         */
        downloadAndCacheUrl(url, options = {}) {
            return cacheUrl(
                url,
                options,
                filePath => fs.downloadFile(url, filePath, options.headers)
            );
        },

        /**
         * seed the cache for a specific url with a local file
         * @param url
         * @param seedPath
         * @param options
         * @returns {Promise}
         */
        seedAndCacheUrl(url, seedPath, options = {}) {
            return cacheUrl(
                url,
                options,
                filePath => fs.copyFile(seedPath, filePath)
            );
        },

        /**
         * delete the cache entry and file for a given url
         * @param url
         * @param options
         * @returns {Promise}
         */
        deleteUrl(url, options = {}) {
            if (!isCacheable(url)) {
                return Promise.reject(new Error('Url is not cacheable'));
            }
            _.defaults(options, defaultOptions);
            const cacheableUrl = path.getCacheableUrl(url, options.useQueryParamsInCacheKey);
            const filePath = path.getImageFilePath(cacheableUrl, options.cacheLocation);
            // remove file from cache
            return fs.deleteFile(filePath);
        },

        /**
         * delete all cached file from the filesystem and cache
         * @param options
         * @returns {Promise}
         */
        clearCache(options = {}) {
            _.defaults(options, defaultOptions);
            return options.urlCache.flush()
                .then(() => fs.cleanDir(options.cacheLocation));
        },

        /**
         * return info about the cache, list of files and the total size of the cache
         * @param options
         * @returns {Promise.<{file: Array, size: Number}>}
         */
        getCacheInfo(options = {}) {
            _.defaults(options, defaultOptions);
            return fs.getDirInfo(options.cacheLocation);
        },

    };
};
