angular.module('stocks.services', [])

.constant('FIREBASE_URL', 'https://shining-inferno-2964.firebaseio.com/stocks/')

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
        scope: null,
        controller: 'LoginSearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    } else if (id == 3) {
      $ionicModal.fromTemplateUrl('templates/signup.html', {
        scope: null,
        controller: 'LoginSearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
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

.factory('FirebaseRef', ['$firebase', 'FIREBASE_URL', function ($firebase, FIREBASE_URL) {
  
  var firebaseRef = new Firebase(FIREBASE_URL);
  return firebaseRef;
}])

.factory('FirebaseUserRef', ['FirebaseRef', function (FirebaseRef) {
  var userRef = FirebaseRef.child('users');  

  return userRef;
}])

.factory('UserService', ['$rootScope', '$window', '$timeout', 'FirebaseRef', 'FirebaseUserRef', 'MyStocksArrayService', 'MyStocksCacheService', 'ModalService', 'NotesCacheService', function ($rootScope, $window, $timeout, FirebaseRef, FirebaseUserRef, MyStocksArrayService, MyStocksCacheService, ModalService, NotesCacheService) {
  
  var login = function(user, signup) {
    FirebaseRef.authWithPassword({
      email    : user.email,
      password : user.password
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        $rootScope.currentUser = user;
        if (signup) {
          ModalService.closeModal();
        } else {
          // remove all the stocks and notes cache
          MyStocksCacheService.removeAll();
          NotesCacheService.removeAll();

          loadUserData(authData);

          ModalService.closeModal();
          // close the window after 400th of a sec when the modal is closing
          $timeout(function() {
            $window.location.reload(true);
          }, 400);
        }
      }
    });
  };

  var signup = function(user) {
    FirebaseRef.createUser({
      email    : user.email,
      password : user.password
    }, function(error, userData) {
      if (error) {
        console.log("Error creating user:", JSON.stringify(error));
      } else {
        // log user in after they successfully create an account
        login(user, true);
        // console.log("Successfully created user account with uid:", userData.uid);
        // emails node in db, push email prop into it
        FirebaseRef.child('emails').push(user.email);
        // create a unique node for each user
        FirebaseUserRef.child(userData.uid).child('stocks').set(MyStocksArrayService);

        var stocksWithNotes = NotesCacheService.keys();

        stocksWithNotes.forEach(function(stockWithNotes) {
          var notes = NotesCacheService.get(stockWithNotes);

          notes.forEach(function(note) {
            // each iteration pushes the note into the users note node
            FirebaseUserRef.child(userData.uid).child('notes').child(note.ticker).push(note);
          });
        });
      }
    });
  };

  var logout = function(user) {
    FirebaseRef.unauth();
    // remove all user info from cache on log out
    NotesCacheService.removeAll();
    MyStocksCacheService.removeAll();
    // reload the window
    $window.location.reload();
    $rootScope.currentUser = '';
  };

  var updateStocks = function(stocks) {
    FirebaseUserRef.child(getUser().uid).child('stocks').set(stocks);
  };

  var updateNotes = function(ticker, notes) {
    FirebaseUserRef.child(getUser().uid).child('notes').child(ticker).remove();
    notes.forEach(function(note) {
      FirebaseUserRef.child(getUser().uid).child('notes').child(note.ticker).push(note);
    });
  };

  var loadUserData = function(authData) {
    // once method will read the values and init the function which takes each value as a snapshot
    FirebaseUserRef.child(authData.uid).child('stocks').once('value', function(snapshot) {
      var stocksFromDB = [];
      
      snapshot.val().forEach(function(stock) {
        var stockToAdd = {ticker: stock.ticker};
        stocksFromDB.push(stockToAdd);
      });

      MyStocksCacheService.put('myStocks', stocksFromDB);

    }, function(error) {
      console.log("Firebase error -> stocks" + error);
    });

    FirebaseUserRef.child(authData.uid).child('notes').once('value', function(snapshot) {
      snapshot.forEach(function(stockWithNotes) {
        var notesFromDB = [];

        stockWithNotes.forEach(function(note) {
          notesFromDB.push(note.val());
          // place the note in the correct cache
          var cacheKey = note.child('ticker').val();
          NotesCacheService.put(cacheKey, notesFromDB);
        });
      });
    }, function(error) {
      console.log("Firebase error -> " + error);
    });
  };

  var getUser = function() {
    // this provides a signed in user's info
    // return null if no users signed in
    // this method will run when the service is initialized by a controller injecting it as a dependency
    return FirebaseRef.getAuth();
  };

  if (getUser()) {
    // if true, set currentUser to the user from Firebase getAuth 
    $rootScope.currentUser = getUser;
  }

  return {
    login: login,
    signup: signup,
    logout: logout,
    updateStocks: updateStocks,
    updateNotes: updateNotes,
    getUser: getUser
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

.factory('StockPriceCacheService', ['CacheFactory', function (CacheFactory) {
  
  var stockDetailsCache;

  if (!CacheFactory.get('stockPriceCache')) {
    stockPriceCache = CacheFactory('stockPriceCache', {
      maxAge: 5 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  } else {
    stockPriceCache = CacheFactory.get('stockPriceCache');
  }

  return stockPriceCache;
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

.factory('FollowStockService', ['MyStocksArrayService', 'MyStocksCacheService', 'UserService', function (MyStocksArrayService, MyStocksCacheService, UserService) {

  return {
    follow: function(ticker) {
      var stockToAdd = {"ticker": ticker};
      MyStocksArrayService.push(stockToAdd);
      // update the myStocks cache with the MyStocksArrayService with stockToAdd
      MyStocksCacheService.put('myStocks', MyStocksArrayService);

      if (UserService.getUser()) {
        // if there is a user, call the updateStocks method and pass in update stocks array
        UserService.updateStocks(MyStocksArrayService);
      }
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

          if (UserService.getUser()) {
            UserService.updateStocks(MyStocksArrayService);
          }

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

.factory('StockDataService', ['$q', '$http', 'EncodeURIService', 'StockDetailsCacheService', 'StockPriceCacheService', function ($q, $http, EncodeURIService, StockDetailsCacheService, StockPriceCacheService) {
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
        cacheKey = ticker,
        // url equal to api query string
        url = "http://finance.yahoo.com/webservice/v1/symbols/" +  ticker + "/quote?format=json&view=detail";

    $http.get(url)
      // instead of then callback, we now use success and error callbacks
      .success(function (json) {
        // set jsonData to the object property path
        var jsonData = json.list.resources[0].resource.fields; 
        // handle the resolution of the deferred promise, q method resolve
        deferred.resolve(jsonData);
        StockPriceCacheService.put(cacheKey, jsonData);
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

.factory('NotesService', ['NotesCacheService', 'UserService', function (NotesCacheService, UserService) {
  
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

      if (UserService.getUser()) {
        var notes = NotesCacheService.get(ticker);
        UserService.updateNotes(ticker, stockNotes);
      }
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

      if (UserService.getUser()) {
        var notes = NotesCacheService.get(ticker);
        UserService.updateNotes(ticker, stockNotes);
      }
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
}])

.factory('SearchService', ['$q', '$http', function ($q, $http) {

  return {
    search: function(query) {
      var deferred = $q.defer(),
          url = 'http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + query + '&region=US&lang=en-US&row=ALL& k=YAHOO.Finance.SymbolSuggest.ssCallback';

      // routing the query through Yahoo DB
      YAHOO = window.YAHOO = {
        Finance: {
          SymbolSuggest: {}
        }
      };

      // DB path function
      YAHOO.Finance.SymbolSuggest.ssCallback = function(data) {
        var jsonData = data.ResultSet.Result;

        deferred.resolve(jsonData);
      };

      $http.jsonp(url)
        .then(YAHOO.Finance.SymbolSuggest.ssCallback);

      return deferred.promise;
    }
  };
}]);