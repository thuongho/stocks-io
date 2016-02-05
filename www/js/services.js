angular.module('stocks.services', [])

.factory('StockDataService', ['$q', '$http', function ($q, $http) {
  var getDetailsData = function(ticker) {
    var deferred = $q.defer(),
        url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22" + ticker + "%22)&format=json&env=http://datatables.org/alltables.env";
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