angular.module('stocks.services', [])

.factory('EncodeURIService', function () {
  // remove all %20 and add them back
  return {
    encode: function(string) {
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})

.factory('ModalService', ['$ionicModal', function ($ionicModal) {
  
  this.openModal = function(id) {
    var _this = this;

    if (id == 1) {
      $ionicModal.fromTemplateUrl('templates/search.html', {
        // null b/c referencing methods directly from view
        scope: null,
        controller: 'SearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    } else if (id == 2) {
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
      }).then(function(modal) {
        $scope.modal = modal;
      });
    } else if (id == 3) {
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
      }).then(function(modal) {
        $scope.modal = modal;
      });
    }
  };

  this.closeModal = function() {
    var _this = this;
    // protect against any error cause by the loading of this service without a modal being open
    if (!_this.modal) return;
    _this.modal.hide();
    _this.modal.remove();
  };

  return {
    openModal: this.openModal,
    closeModal: this.closeModal
  };

}])

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

.factory('NotesCacheService', ['CacheFactory', function (CacheFactory) {
  var notesCache;

  if (!CacheFactory.get('notesCache')) {
    notesCache = CacheFactory('notesCache', {
      storageMode: 'localStorage'
    });
  } else {
    notesCache = CacheFactory.get('notesCache');
  }
  return notesCache;
}])

.factory('FillMyStocksCacheService', ['CacheFactory', function (CacheFactory) {
  // add default stocks into the app when first launch
  // user manages which stock following after
  var myStocksCache;

  if (!CacheFactory.get('myStocksCache')) {
    myStocksCache = CacheFactory('myStocksCache', {
      storageMode: 'localStorage'
    });
  } else {
    myStocksCache = CacheFactory.get('myStocksCache');
  }

  var fillMyStocksCache = function() {
    var myStocksArray = [
      {ticker: "GPRO"},
      {ticker: "FB"},
      {ticker: "TSLA"},
      {ticker: "NFLX"},
      {ticker: "LNKD"},
      {ticker: "GOOG"},
      {ticker: "ATVI"},
      {ticker: "GLUU"},
      {ticker: "ZNGA"}
    ];

    myStocksCache.put('myStocks', myStocksArray);
  };

  return {
    fillMyStocksCache: fillMyStocksCache
  };
}])

.factory('MyStocksCacheService', ['CacheFactory', function (CacheFactory) {
  var myStocksCache = CacheFactory.get('myStocksCache');

  return myStocksCache;
}])

.factory('MyStocksArrayService', ['FillMyStocksCacheService', 'MyStocksCacheService', function (FillMyStocksCacheService, MyStocksCacheService) {
  // use this service only to manage myStocksArray
  // populate the myStocks list with default stocks and only when app first launch on device
  // check to see if a myStocks key exists in the MyStocksCache
  if (!MyStocksCacheService.info('myStocks')) {
    FillMyStocksCacheService.fillMyStocksCache();
  }
  var myStocks = MyStocksCacheService.get('myStocks');

  return myStocks;
}])

.factory('FollowStockService', ['MyStocksArrayService', 'MyStocksCacheService', function (MyStocksArrayService, MyStocksCacheService) {
  

  return {
    follow: function(ticker) {
      var stockToAdd = {"ticker": ticker};
      MyStocksArrayService.push(stockToAdd);
      // update the myStocks cache with the MyStocksArrayService with stockToAdd
      MyStocksCacheService.put('myStocks', MyStocksArrayService);
    },
    unfollow: function(ticker) {
      for (var i = 0; i < MyStocksArrayService.length; i++) {
        if (MyStocksArrayService[i].ticker === ticker) {
          // if it matches, splice the object from the array
          MyStocksArrayService.splice(i, 1);
          // remove the myStocks cache
          MyStocksCacheService.remove('myStocks');
          // update the myStocks Cache with the updated array
          MyStocksCacheService.put('myStocks', MyStocksArrayService);
          break;
        }
      };
    },
    checkFollowing: function(ticker) {
      for (var i = 0; i < MyStocksArrayService.length - 1; i++) {
        if (MyStocksArrayService[i].ticker === ticker) {
          return true;
        }
      }
      return false;
    }
  };
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
}])

.factory('NotesService', ['NotesCacheService', function (NotesCacheService) {
  
  return {
    getNotes: function(ticker) {
      return NotesCacheService.get(ticker);
    },
    addNotes: function(ticker, note) {
      var stockNotes = [];
      // if NotesCacheService and get a cache for current stock
      if (NotesCacheService.get(ticker)) {
        // set stockNotes array equal to value of cache
        stockNotes = NotesCacheService.get(ticker);
        // add the new note by pushing it into the array
        stockNotes.push(note);
      } else {
        stockNotes.push(note);
      }
      NotesCacheService.put(ticker, stockNotes);
    },
    deleteNotes: function(ticker, index) {
      var stockNotes = [];
      // if there is a note open, we know there is an existing cache
      // call to the NotesCacheService to get the related cache
      stockNotes = NotesCacheService.get(ticker);
      // splice that note out of the stocks array using the index
      stockNotes.splice(index, 1);
      // reset the cache and put the updated array back into the cache
      NotesCacheService.put(ticker, stockNotes);
    }
  };
}])

.factory('NewsService', ['$q', '$http', function ($q, $http) {
  
  return {
    getNews: function(ticker) {
      var deferred = $q.defer(),
          x2js = new X2JS(),
          url = 'http://finance.yahoo.com/rss/headline?s=' + ticker;

      $http.get(url)
        .success(function (xml) {
          var xmlDoc = x2js.parseXmlString(xml),
              json = x2js.xml2json(xmlDoc),
              jsonData = json.rss.channel.item;

          deferred.resolve(jsonData);
        })
        .error(function (error) {
          deferred.reject();
          console.log("News error: " + JSON.stringify(error));
        });

      return deferred.promise;
    }
  };
}]);