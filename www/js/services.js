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

.factory('StockDataService', ['$q', '$http', 'EncodeURIService', function ($q, $http, EncodeURIService) {
  var getDetailsData = function(ticker) {
    var deferred = $q.defer(),
        query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")',
        url = 'http://query.yahooapis.com/v1/public/yql?q=' + EncodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

        console.log(url);
    $http.get(url)
      .success(function (json) {
        var jsonData = json.query.results.quote; 
        deferred.resolve(jsonData);
      })
      .error(function (error) {
        console.log("Details data error: " + error);
        deferred.reject();
      });

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
}]);