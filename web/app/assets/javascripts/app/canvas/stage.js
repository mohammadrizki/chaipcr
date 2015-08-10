window.ChaiBioTech.ngApp.factory('stage', [
  'ExperimentLoader',
  '$rootScope',
  'step',
  'previouslySelected',

  function(ExperimentLoader, $rootScope, step, previouslySelected) {

    return function(model, stage, allSteps, index, fabricStage, $scope, insert) {

      this.model = model;
      this.index = index;
      this.canvas = stage;
      this.myWidth = (this.model.steps.length * 120);
      this.parent = fabricStage;
      this.childSteps = [];
      this.previousStage = this.nextStage = this.noOfCycles = null;
      this.insertMode = insert;

      this.addNewStep = function(data, currentStep) {

        var width = (currentStep.index === this.childSteps.length - 1) ? 121 : 120;
        this.myWidth = this.myWidth + width;
        this.stageRect.setWidth(this.myWidth);
        this.roof.setWidth(this.myWidth - 4);

        this.moveAllStepsAndStages();
        // Now insert new step;
        var start = currentStep.index;
        var newStep = new step(data.step, this, start);
        newStep.name = "I am created";
        newStep.render();
        newStep.addImages();
        newStep.ordealStatus = currentStep.ordealStatus;

        this.childSteps.splice(start + 1, 0, newStep);
        this.configureStep(newStep, start);
        this.parent.allStepViews.splice(currentStep.ordealStatus, 0, newStep);

        var circles = this.parent.reDrawCircles();
        this.parent.addRampLinesAndCircles(circles);

        if(this.model.stage_type === "cycling" && this.childSteps.length > 1) {
          this.cycleNo.setVisible(true);
          this.cycleX.setVisible(true);
          this.cycles.setVisible(true);
        }

        $scope.applyValues(newStep.circle);
        newStep.circle.manageClick(true);
        this.parent.setDefaultWidthHeight();
      };

      this.deleteStep = function(data, currentStep) {

        // This methode says what happens in the canvas when a step is deleted
        var width = (currentStep.index === this.childSteps.length - 1) ? 121 : 120, selected = null;
        this.myWidth = this.myWidth - width;
        this.stageRect.setWidth(this.myWidth);
        this.roof.setWidth(this.myWidth - 4);

        this.deleteAllStepContents(currentStep);

        if(currentStep.previousStep) {
          currentStep.previousStep.nextStep = (currentStep.nextStep) ? currentStep.nextStep : null;
          selected = currentStep.previousStep;
        }

        if(currentStep.nextStep) {
          currentStep.nextStep.previousStep = (currentStep.previousStep) ? currentStep.previousStep: null;
          selected = currentStep.nextStep;
        }

        var start = currentStep.index;
        var ordealStatus = currentStep.ordealStatus;
        this.childSteps.splice(start, 1);
        this.parent.allStepViews.splice(ordealStatus - 1, 1);

        if(this.childSteps.length > 0) {

          this.configureStepForDelete(currentStep, start);

          if(this.model.stage_type === "cycling" && this.childSteps.length === 1) {
            this.cycleNo.setVisible(false);
            this.cycleX.setVisible(false);
            this.cycles.setVisible(false);
          }

        } else { // if all the steps in the stages are deleted;

          this.deleteStageContents();

          if(this.previousStage) {
            this.previousStage.nextStage = (this.nextStage) ? this.nextStage : null;
          } else {
            this.nextStage.previousStage = null;
          }

          if(this.nextStage) {
            this.nextStage.previousStage = (this.previousStage) ? this.previousStage : null;
          } else {
            this.previousStage.nextStage = null;
          }

          selected = (this.previousStage) ? this.previousStage.childSteps[this.previousStage.childSteps.length - 1] : this.nextStage.childSteps[0];
          this.parent.allStageViews.splice(this.index, 1);
          this.updateStageData(-1);

          if(! selected.parentStage.nextStage && this.index !== 0) { //we are exclusively looking for last stage
            selected.parentStage.addBorderRight();
            selected.borderRight.setVisible(false);
          }
        }


        this.moveAllStepsAndStages(true); // true imply call is from delete section;

        var circles = this.parent.reDrawCircles();
        this.parent.addRampLinesAndCircles(circles);

        $scope.applyValues(selected.circle);
        selected.circle.manageClick();
        currentStep = null; // we force it to be collected by garbage collector
        this.parent.setDefaultWidthHeight();
        //if(this.childSteps.length === 0) { delete(this); }
      };

      this.deleteStageContents = function() {

        this.canvas.remove(this.stageGroup);
        this.canvas.remove(this.borderRight);

      };

      this.deleteAllStepContents = function(currentStep) {

        this.canvas.remove(currentStep.stepGroup);
        this.canvas.remove(currentStep.rampSpeedGroup);
        this.canvas.remove(currentStep.commonFooterImage);
        this.canvas.remove(currentStep.darkFooterImage);
        this.canvas.remove(currentStep.whiteFooterImage);
        currentStep.circle.removeContents();

      };

      this.moveAllStepsAndStages = function(del) {

        var currentStage = this;

        while(currentStage.nextStage) {

          currentStage.nextStage.getLeft();
          currentStage.nextStage.stageGroup.set({left: currentStage.nextStage.left }).setCoords();
          var thisStageSteps = currentStage.nextStage.childSteps, stepCount = thisStageSteps.length;

          for(var i = 0; i < stepCount; i++ ) {
            if(del === true) {
              thisStageSteps[i].moveStep(-1);
            } else {
              thisStageSteps[i].moveStep(1);
            }

          }

          currentStage = currentStage.nextStage;
        }

        currentStage.borderRight.set({left: currentStage.myWidth + currentStage.left + 2 }).setCoords();
      };

      this.updateStageData = function(action) {

        var currentStage = this;

        while(currentStage.nextStage) {
          currentStage.nextStage.index = currentStage.nextStage.index + action;
          //this.stageNo.text = "''"
          var indexNumber = currentStage.nextStage.index + 1;
          var number = (indexNumber < 10) ? "0" + indexNumber : indexNumber;
          currentStage.nextStage.stageNo.text = number.toString();
          currentStage = currentStage.nextStage;
        }

      };
      this.configureStepForDelete = function(newStep, start) {

        for(var j = start; j < this.childSteps.length; j++) {

          var thisStep = this.childSteps[j];
          thisStep.index = thisStep.index - 1;
          thisStep.model.name = "STEP " + (thisStep.index + 1);
          thisStep.stepName.text = thisStep.model.name;
          thisStep.moveStep(-1);
        }
      };

      this.configureStep = function(newStep, start) {
        // insert it to all steps, add next and previous , rerender circles;
        for(var j = start + 1; j < this.childSteps.length; j++) {

          var thisStep = this.childSteps[j];
          thisStep.index = thisStep.index + 1;
          thisStep.model.name = "STEP " + (thisStep.index + 1);
          thisStep.stepName.text = thisStep.model.name;
          thisStep.moveStep(1);
        }

        if(this.childSteps[newStep.index + 1]) {
          newStep.nextStep = this.childSteps[newStep.index + 1];
          newStep.nextStep.previousStep = newStep;
        }

        if(this.childSteps[newStep.index - 1]) {
          newStep.previousStep = this.childSteps[newStep.index - 1];
          newStep.previousStep.nextStep = newStep;
        }

        if(newStep.index === this.childSteps.length - 1) {

          newStep.borderRight.setVisible(false);
          newStep.previousStep.borderRight.setVisible(true);
        }
      };

      this.getLeft = function() {

        if(this.previousStage) {
          this.left = this.previousStage.left + this.previousStage.myWidth + 2;
        } else {
          this.left = 32;
        }
        return this;
      };

      this.addRoof = function() {

        this.roof = new fabric.Line([0, 40, (this.myWidth - 4), 40], {
            stroke: 'white', strokeWidth: 2, selectable: false
          }
        );

        return this;
      };

      this.borderLeft = function() {

        this.border = new fabric.Line([0, 0, 0, 342], {
            stroke: '#ff9f00',  left: - 2,  top: 60,  strokeWidth: 2, selectable: false
          }
        );

        return this;
      };

      //This is a special case only for the last stage
      this.addBorderRight = function() {

        this.borderRight = new fabric.Line([0, 0, 0, 342], {
            stroke: '#ff9f00',  left: (this.myWidth + this.left + 2) || 122,  top: 60,  strokeWidth: 2, selectable: false
          }
        );

        this.canvas.add(this.borderRight);
        return this;
      };

      this.writeMyNo= function() {

        var temp = parseInt(this.index) + 1;
        temp = (temp < 10) ? "0" + temp : temp;

        this.stageNo = new fabric.Text(temp, {
            fill: 'white',  fontSize: 32, top : 7,  left: 2,  fontFamily: "Ostrich Sans", selectable: false
          }
        );

        return this;
      };

      this.writeMyName = function() {

        var stageName = (this.model.name).toUpperCase();

        this.stageName = new fabric.Text(stageName, {
            fill: 'white',  fontSize: 9,  top : 28, left: 25, fontFamily: "Open Sans",  selectable: false,
          }
        );

        return this;

      };

      this.writeNoOfCycles = function() {

        this.noOfCycles = this.noOfCycles || this.model.num_cycles;

        this.cycleNo = new fabric.Text(String(this.noOfCycles), {
          fill: 'white',  fontSize: 32, top : 7,  fontWeight: "bold",  left: 0, fontFamily: "Ostrich Sans", selectable: false
        });
        console.log(this.cycleNo.width, "cool");
        this.cycleX = new fabric.Text("x", {
            fill: 'white',  fontSize: 22, top : 16, left: this.cycleNo.width + 5,
            fontFamily: "Ostrich Sans", selectable: false
          }
        );

        this.cycles = new fabric.Text("CYCLES", {
            fill: 'white',  fontSize: 10, top : 28,
            left: this.cycleX.width + this.cycleNo.width + 10 ,
            fontFamily: "Open Sans",  selectable: false
          }
        );

        this.cycleGroup = new fabric.Group([this.cycleNo, this.cycleX, this.cycles], {
          originX: "left",  originY: "top",
          left: 120
        });
        return this;
      };

      this.addSteps = function() {

        var steps = this.model.steps, stepView, tempStep = null, noOfSteps = steps.length;
        this.childSteps = [];

        for(var stepIndex = 0; stepIndex < noOfSteps; stepIndex ++) {

          stepView = new step(steps[stepIndex].step, this, stepIndex);

          if(tempStep) {
            tempStep.nextStep = stepView;
            stepView.previousStep = tempStep;
          }

          if(ChaiBioTech.app.newStepId && steps[stepIndex].step.id === ChaiBioTech.app.newStepId) {
            ChaiBioTech.app.newlyCreatedStep = stepView;
            ChaiBioTech.app.newStepId = null;
          }

          tempStep = stepView;
          this.childSteps.push(stepView);

          if(! this.insertMode) {
            allSteps.push(stepView);
            stepView.ordealStatus = allSteps.length;
            stepView.render();
          }

        }
        if(! this.insertMode) {
          stepView.borderRight.setVisible(false);
        }
      };

      this.render = function() {
          this.getLeft()
          .addRoof()
          .borderLeft()
          .writeMyNo()
          .writeMyName()
          .writeNoOfCycles();

          this.stageRect = new fabric.Rect({
              left: 0,  top: 0, fill: '#ffb400',  width: this.myWidth,  height: 384,  selectable: false
            }
          );
          //this.canvas.add(this.stageRect, this.roof, this.border, this.stageNo, this.stageName);

          if(this.model.stage_type === "cycling" && this.model.steps.length > 1) {

            this.stageGroup = new fabric.Group([
                this.stageRect, this.roof,  this.border,  this.stageNo, this.stageName, this.cycleGroup
              ], {
                  originX: "left", originY: "top", left: this.left,top: 0, selectable: false, hasControls: false
                }
            );

          } else {

            this.stageGroup = new fabric.Group([
                this.stageRect, this.roof, this.border, this.stageNo, this.stageName
              ], {
                originX: "left",  originY: "top", left: this.left,  top: 0, selectable: false,  hasControls: false
              }
            );

          }

          this.canvas.add(this.stageGroup);
          this.addSteps();
          //this.canvas.renderAll();
      };

      this.manageBordersOnSelection = function(color) {

        this.border.setStroke(color);

        if(this.nextStage) {
          this.nextStage.border.setStroke(color);
        } else {
          this.borderRight.setStroke(color);
        }
      };

      this.manageFooter = function(visible, color, length) {

        for(var i = 0; i< length; i++) {

          this.childSteps[i].commonFooterImage.setVisible(visible);
          this.childSteps[i].stepName.setFill(color);
        }
      };

      this.changeFillsAndStrokes = function(color)  {

        this.roof.setStroke(color);
        this.stageNo.fill = this.stageName.fill = color;
        this.cycleNo.fill = this.cycleX.fill = this.cycles.fill = color;
      };

      this.selectStage =  function() {

        var length = this.childSteps.length;

        if(previouslySelected.circle) {
          var previousSelectedStage = previouslySelected.circle.parent.parentStage;
          var previousLength = previousSelectedStage.childSteps.length;

          previousSelectedStage.changeFillsAndStrokes("white");
          previousSelectedStage.manageBordersOnSelection("#ff9f00");
          previousSelectedStage.manageFooter(false, "white", previousLength);
        }

        this.changeFillsAndStrokes("black");
        this.manageBordersOnSelection("#cc6c00");
        this.manageFooter(true, "black", length);
      };

    };

  }
]);
