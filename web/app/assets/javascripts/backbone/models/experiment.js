ChaiBioTech.Models.Experiment = ChaiBioTech.Models.Experiment || {};

ChaiBioTech.Models.Experiment = Backbone.Model.extend({
	
	url: "/experiments",

	defaults: {

		experiment: {
			name: "",
			qpcr: true,
			protocol: {

			}
		}
	},

	initialize: function(){
		_.bindAll(this ,"afterSave");
	},
	saveData: function( action ) {
		that = this;
		if(action == "update") {
			var data = this.get("experiment");
			dataToBeSend = {"experiment":{"name": data["name"]}}
			$.ajax({
				url: "/experiments/"+data["id"],
				contentType: 'application/json',
				type: 'PUT',
				data: JSON.stringify(dataToBeSend)
			})
			.done(function(data) {
					console.log("Boom", data, that);
			})
			.fail(function() {
				console.log("Failed to update");
			})
		}else {
			this.save(null, { success: this.afterSave });
		}
	},

	afterSave: function(response) {
		console.log(response);
		this.trigger("Saved");
	},

	createStep: function(step, targetStage) {
		that = this;
		stage = step.options.parentStage.model;
		dataToBeSend = {"prev_id": step.model.id};
		console.log("Data To Server", dataToBeSend);
		$.ajax({
			url: "/stages/"+stage.id+"/steps",
			contentType: 'application/json',
			type: 'POST',
			data: JSON.stringify(dataToBeSend)
		})
		.done(function(data) {
			that.getLatestModel();
		})
		.fail(function() {
			alert("Failed to update");
			console.log("Failed to update");
		}); 
	},

	getLatestModel: function(callback) {
		that = this;
		var data = this.get("experiment");
		$.ajax({
			url: "/experiments/"+data["id"],
			contentType: 'application/json',
			type: 'GET'
		})
		.done(function(data) {
				that.set('experiment', data["experiment"]);
				that.trigger("modelUpdated");	
		})
		.fail(function() {
			console.log("Failed to update");
		})
	},

	deleteStep: function(step) {
		that = this;
		$.ajax({
			url: "/steps/"+step.model.id,
			contentType: 'application/json',
			type: 'DELETE'
		})
		.done(function(data) {
			console.log(data);
			that.getLatestModel(function() {
				step.deleteView();
			});
		})
		.fail(function() {
			alert("Failed to update");
			console.log("Failed to update");
		}); 
	}
});

ChaiBioTech.Collections.Experiment = ChaiBioTech.Collections.Experiment || {};

ChaiBioTech.Collections.Experiment = Backbone.Collection.extend({

	model: ChaiBioTech.Models.Experiment,
	
	url: "/experiments"	
})