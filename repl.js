/*
 * META Storage
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var repl = require("repl");
var Api = require("./index.js");

if(!process.argv[2]){
	console.error("API url must be specified as first argument.");
	process.exit();
}

if(!process.argv[3]){
	console.error("API clientid must be specified as second argument.");
	process.exit();
}

if(!process.argv[4]){
	console.error("API secret must be specified as second argument.");
	process.exit();
}

var client = new Api.Client(process.argv[2], process.argv[3], process.argv[4]);

var replServer = repl.start({
	prompt: "meta-storage> "
});

var reply = function(p){

	p.then(function(res){
		
		console.log("\nReply:");
		console.dir(res, { colors: true, depth: null });

		console.log("Done.");

	}, function(err){
		console.error(err);
	});

};

replServer.context.api = {

	write: function(bucket, objectId, mimeType, content){
		reply(client.write(bucket, objectId, mimeType, content));
	},
	
	writeMulti: function(bucket, files){
		reply(client.writeMulti(bucket, files));
	},

	writeFile: function(bucket, objectId, filename){
		reply(client.writeFile(bucket, objectId, filename));
	},

	writeFileMulti: function(bucket, files){
		reply(client.writeFileMulti(bucket, files));
	},

	get: function(bucket, objectId, withType){
		reply(client.get(bucket, objectId, withType));
	},

	save: function(bucket, objectId, filename){
		reply(client.save(bucket, objectId, filename));
	},

	getMeta: function(bucket, objectId){
		reply(client.getMeta(bucket, objectId));
	},

	delete: function(bucket, objectId){
		reply(client.delete(bucket, objectId));
	},

	listBuckets: function(){
		reply(client.listBuckets());
	},

	listObjects: function(bucket){
		reply(client.listObjects(bucket));
	},

	close: function(){
		process.exit();
	}

};