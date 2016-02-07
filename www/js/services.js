angular.module('stocks.services', [])

.factory('EncodeURIService', function () {
  // remove all %20 and add them back
  return {
    encode: function(string) {
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})

.factory('DateService', ['$filter', function ($filter) {

  var currentDate = function() {
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var oneYearAgoDate = function() {
    // minus 365 to get one year ago
    var d = new Date(new Date().setDate(new Date().getDate() - 365));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  return {
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate
  };
}])

.factory('ChartDataCacheService', ['CacheFactory', function (CacheFactory) {
  
  var chartDataCache;

  if (!CacheFactory.get('chartDataCache')) {
    chartDataCache = CacheFactory('chartDataCache', {
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  } else {
    chartDataCache = CacheFactory.get('chartDataCache');
  }

  return chartDataCache;
}])

.factory('StockDetailsCacheService', ['CacheFactory', function (CacheFactory) {
  
  var stockDetailsCache;

  if (!CacheFactory.get('stockDetailsCache')) {
    stockDetailsCache = CacheFactory('stockDetailsCache', {
      maxAge: 60 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  } else {
    stockDetailsCache = CacheFactory.get('stockDetailsCache');
  }

  return stockDetailsCache;
}])

.factory('StockDataService', ['$q', '$http', 'EncodeURIService', 'StockDetailsCacheService', function ($q, $http, EncodeURIService, StockDetailsCacheService) {
  var getDetailsData = function(ticker) {
    var deferred = $q.defer(),

        cacheKey = ticker,
        stockDetailsCache = StockDetailsCacheService.get(cacheKey),

        query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")',
        url = 'http://query.yahooapis.com/v1/public/yql?q=' + EncodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if (stockDetailsCache) {
      deferred.resolve(stockDetailsCache);
    } else {
      $http.get(url)
        .success(function (json) {
          var jsonData = json.query.results.quote; 
          deferred.resolve(jsonData);
          StockDetailsCacheService.put(cacheKey, jsonData);
        })
        .error(function (error) {
          // console.log("Details data error: " + error);
          console.log("Details data error: " + JSON.stringify(error));
          deferred.reject();
        });
      }

    return deferred.promise;
  };
  var getPriceData = function(ticker) {
    // define a variable called deferred and set it to q method defer
    var deferred = $q.defer(), 
        // url equal to api query string
        url = "http://finance.yahoo.com/webservice/v1/symbols/" +  ticker + "/quote?format=json&view=detail";

    $http.get(url)
      // instead of then callback, we now use success and error callbacks
      .success(function (json) {
        // set jsonData to the object property path
        var jsonData = json.list.resources[0].resource.fields; 
        // handle the resolution of the deferred promise, q method resolve
        deferred.resolve(jsonData);
      })
      .error(function (error) {
        console.log("Price data error: " + error);
        deferred.reject();
      });

    return deferred.promise;
  }
  
  // return something or else it will give error
  return {
    getPriceData: getPriceData,
    getDetailsData: getDetailsData
  }; 
}])

.factory('ChartDataService', ['$q', '$http', 'EncodeURIService', 'ChartDataCacheService', function ($q, $http, EncodeURIService, ChartDataCacheService) {
  var getHistoricalData = function(ticker, fromDate, todayDate) {

    var deferred = $q.defer(),

        cacheKey = ticker,
        chartDataCache = ChartDataCacheService.get(cacheKey),

        query =  'select * from yahoo.finance.historicaldata where symbol = "' + ticker + '" and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"',
        url = 'http://query.yahooapis.com/v1/public/yql?q=' + EncodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    // if there is chartdataCache
    if (chartDataCache) {
      // resolve the chartDataCache and won't send data to api
      deferred.resolve(chartDataCache);
    } else {
      // make a call to the api
      $http.get(url)
        .success(function (json) {
          // console.log(json);
          var jsonData = json.query.results.quote;

          var priceData = [],
              volumeData = [];

          jsonData.forEach(function (dayDataObject) {
            var dateToMilliSec = dayDataObject.Date,
                date = Date.parse(dateToMilliSec),
                price = parseFloat(Math.round(dayDataObject.Close * 100) / 100).toFixed(3),
                volume = dayDataObject.Volume,

            // format data
                volumeDatum = '[' + date + ',' + volume + ']',
                priceDatum = '[' + date +  ',' + price + ']';
                // console.log(volumeDatum);
                // console.log(priceDatum);

            // unshift into the arrays
            volumeData.unshift(volumeDatum);
            priceData.unshift(priceDatum);

          });

          // replicate the formatting in StockCtrl myData
          var formattedChartData = 
            '[{' + 
              '"key": ' + '"volume",' +
              '"bar": ' + 'true,' + 
              '"values": ' + '[' + volumeData + ']' + 
            '},' +
            '{' +
              '"key": ' + '"' + ticker + '",' +
              '"values": ' + '[' + priceData + ']' +
            '}]';

            // console.log(formattedChartData);
          deferred.resolve(formattedChartData);
          ChartDataCacheService.put(cacheKey, formattedChartData);
        })
        .error(function(error) {
          // console.log("Chart data error: " + error);
          console.log("Chart data error: " + JSON.stringify(error));
          deferred.reject();
        });
    }
    return deferred.promise;
  };

  return {
    getHistoricalData: getHistoricalData
  };
}]);