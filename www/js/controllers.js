angular.module('stocks.controllers', [])

.controller('AppCtrl', function ($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
})

.controller('MyStocksCtrl', ['$scope', function ($scope) {
  $scope.myStocksArray = [
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
}])

.controller('StockCtrl', ['$scope', '$stateParams', 'StockDataService', function ($scope, $stateParams, StockDataService) {
  // http://finance.yahoo.com/webservice/v1/symbols/YHOO/quote?format=json&view=detail
  // request data from api
  // $http.get("http://finance.yahoo.com/webservice/v1/symbols/YHOO/quote?format=json&view=detail")
  //   .then(function (jsonData) {
  //     console.log(jsonData.data.list.resources[0].resource.fields);
  //   });
  $scope.ticker = $stateParams.stockTicker;
  $scope.chartView = 1;

  $scope.$on("$ionicView.afterEnter", function() {
    getPriceData();
    getDetailsData();
  });

  $scope.chartViewFunc = function (n) {
    $scope.chartView = n;
  };

  // implement this function after everything is loaded in the above
  // ionic view after enter event
  function getPriceData() {
    var promise = StockDataService.getPriceData($scope.ticker);

    promise.then(function (data) {
      console.log(data);
      $scope.stockPriceData = data;
    });
  }

  function getDetailsData() {
    var promise = StockDataService.getDetailsData($scope.ticker);

    promise.then(function (data) {
      console.log(data);
      $scope.stockDetailsData = data;
    });
  }

  
}]);
