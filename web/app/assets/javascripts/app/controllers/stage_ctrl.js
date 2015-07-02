window.ChaiBioTech.ngApp.controller('StageStepCtrl', [
  '$scope',
  'ExperimentLoader',
  function($scope, ExperimentLoader) {

    var that = this;
    $scope.stage = {};

    $scope.$on('dataLoaded', function() {

      $scope.stage = ExperimentLoader.loadFirstStages();
      $scope.step = ExperimentLoader.loadFirstStep();
      $scope.$emit('general-data-ready');
    });

    $scope.WOWaction = function(cool) {
      console.log(cool);
    };
  }
]);
