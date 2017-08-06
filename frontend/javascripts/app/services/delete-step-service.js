window.ChaiBioTech.ngApp.service('deleteStepService', [
    'constants',
    'correctNumberingService',
    'circleManager',
    function(constants, correctNumberingService, circleManager) {
        
        this.deleteStep = function(stage, data, currentStep, $scope) {

            // This methode says what happens in the canvas when a step is deleted
            var selected;
            stage.setNewWidth(constants.stepWidth * -1);
            stage.deleteAllStepContents(currentStep);
            selected = stage.wireNextAndPreviousStep(currentStep, selected);

            var start = currentStep.index;
            var ordealStatus = currentStep.ordealStatus;
            // Delete data from arrays
            this.deleteFromArrays(stage, start, ordealStatus);
            
            if(stage.childSteps.length > 0) {
                this.configureStepForDelete(stage, currentStep, start);
            } else { // if all the steps in the stages are deleted, We delete the stage itself.
                this.removeWholeStage(stage);
                
            }
            // true imply call is from delete section;
            stage.moveAllStepsAndStages(true);

            this.postDelete (stage, $scope, selected);
            
        };

        this.deleteFromArrays = function(stage, start, ordealStatus) {

            stage.childSteps.splice(start, 1);
            stage.model.steps.splice(start, 1);
            stage.parent.allStepViews.splice(ordealStatus - 1, 1);
        };

        this.configureStepForDelete = function(stage, newStep, start) {

            stage.childSteps.slice(0, start).forEach(function(thisStep) {
            thisStep.configureStepName();
            }, this);

            stage.childSteps.slice(start, stage.childSteps.length).forEach(function(thisStep) {

            thisStep.index = thisStep.index - 1;
            thisStep.configureStepName();
            thisStep.moveStep(-1, true);
            }, this);
        };

        this.removeWholeStage = function(stage) {

            stage.deleteStageContents();
            stage.wireStageNextAndPrevious();

            selected = (stage.previousStage) ? stage.previousStage.childSteps[stage.previousStage.childSteps.length - 1] : stage.nextStage.childSteps[0];
            stage.parent.allStageViews.splice(stage.index, 1);
            selected.parentStage.updateStageData(-1);
        };


        this.postDelete = function(stage, $scope, selected) {

            correctNumberingService.correctNumbering();
            //circleManager.addRampLines();
            circleManager.init(stage.parent);
            circleManager.addRampLinesAndCircles(circleManager.reDrawCircles());
            stage.stageHeader();
            $scope.applyValues(selected.circle);
            selected.circle.manageClick();
            
            if(stage.parent.allStepViews.length === 1) {
                editModeService.editStageMode(stage.parent.editStageStatus);
            }

            stage.parent.setDefaultWidthHeight();
        };
    }
]);
