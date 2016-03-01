/*
 * META Storage
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var request = require("request");
var crypto = require("crypto");
var fs = require("fs");

/*
 * Client constructor
 *
 * options {
 * 		clientid,
 * 		secret
 * }
 *
 * @param string serverUrl
 * @param string clientId
 * @param string secret
 */
var Client = function(serverUrl, clientId, secret){

	this.serverUrl = serverUrl;
	this.clientId = clientId;
	this.secret = secret;

};

/*
 * Returns request options
 *
 * @param string method
 * @param string path
 * @param object formData
 * @return object
 */
Client.prototype.buildRequestOptions = function(method, path, formData, binary, etag){

	var now = new Date();
	var timestr = now.getFullYear() + ":" + now.getMonth() + ":" + now.getDate() + ":" + now.getHours();
	var token = crypto.createHash("sha256").update( this.clientId + this.secret + timestr ).digest("hex");

	var opts = {
		method: method,
		url: this.serverUrl + path,
		headers: {
			"X-ClientId": this.clientId,
			"X-Token": token
		}
	};

	if(formData)
		opts.formData = formData;

	if(binary)
		opts.encoding = null;

	if(etag)
		opts.headers["if-none-match"] = etag;

	return opts;

};

/*
 * Request object write
 *
 * @param string bucket
 * @param object files
 * @return Promise
 */
Client.prototype.requestWriteObject = function(bucket, objectId, files){

	var formData = {};

	if(objectId)
		formData.object = files[0] || null;
	else
		formData["object[]"] = files;

	var opts = this.buildRequestOptions("post", "/" + bucket + ( objectId ? "/" + objectId : "" ), formData);

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {
			
				if(err) return reject(err);
				if(res.statusCode != 200) return reject(body);

				try {

					var resData = JSON.parse(body);
					resolve(resData);

				} catch(e){
					reject(e);
				}
				
			});

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Writes object from string
 *
 * @param string bucket
 * @param string objectId
 * @param string mimeType
 * @param string content
 * @return Promise
 */
Client.prototype.write = function(bucket, objectId, mimeType, content){

	return this.requestWriteObject(bucket, objectId, [{
		value: new Buffer(content),
		options: {
			filename: "default",
			contentType: mimeType
		}
	}]);

};

/*
 * Writes multiple objects from strings
 *
 * @param string bucket
 * @param object files { name: { content: string, mimeType: string } }
 * @return Promise
 */
Client.prototype.writeMulti = function(bucket, files){

	var fileData = [];

	for(var i in files)
		fileData.push({
			value: new Buffer(files[i].content),
			options: {
				filename: i,
				contentType: files[i].mimeType
			}
		});

	return this.requestWriteObject(bucket, null, fileData);

};

/*
 * Writes object from file
 *
 * @param string bucket
 * @param string objectId
 * @param string filename
 * @return Promise
 */
Client.prototype.writeFile = function(bucket, objectId, filename){

	return this.requestWriteObject(bucket, objectId, [ fs.createReadStream(filename) ]);

};

/*
 * Writes object from file and set mimeType
 *
 * @param string bucket
 * @param string objectId
 * @param string filename
 * @param string mimeType
 * @return Promise
 */
Client.prototype.writeFileWithType = function(bucket, objectId, filename, mimeType){

	return this.requestWriteObject(bucket, objectId, [{
		value: fs.createReadStream(filename),
		options: {
			filename: filename,
			contentType: mimeType
		}
	}]);

};

/*
 * Writes multiple objects from files
 *
 * @param string bucket
 * @param array files Array of filenames
 * @return Promise
 */
Client.prototype.writeFileMulti = function(bucket, files){

	var fileData = [];

	for(var i in files)
		fileData.push( fs.createReadStream(files[i]) );

	return this.requestWriteObject(bucket, null, fileData);

};

/*
 * Writes multiple objects from files and set mimeTypes
 *
 * @param string bucket
 * @param object files { filename: mimeType }
 * @return Promise
 */
Client.prototype.writeFileMultiWithType = function(bucket, files){

	var fileData = [];

	for(var i in files)
		fileData.push({
			value: fs.createReadStream(i),
			options: {
				filename: i,
				contentType: files[i]
			}
		});

	return this.requestWriteObject(bucket, null, fileData);

};

/*
 * Returns object
 *
 * @param string bucket
 * @param string objectId
 * @param bool withType If to return mime-type
 * @param string etag
 * @return Promise
 */
Client.prototype.get = function(bucket, objectId, withType, etag){

	var opts = this.buildRequestOptions("get", "/" + bucket + "/" + objectId, null, true, etag);

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {
			
				if(err) return reject(err);
				if(res.statusCode == 304) return resolve(true);
				if(res.statusCode != 200) return reject(body);

				if(withType){

					resolve({
						content: new Buffer(body),
						mimetype: res.headers["content-type"],
						etag: res.headers["etag"]
					});

				} else {
					
					resolve(body);

				}
				
			});

		} catch(e){
			reject(e);
		}

	});	

};

/*
 * Saves object
 *
 * @param string bucket
 * @param string objectId
 * @param string
 * @return Promise
 */
Client.prototype.save = function(bucket, objectId, filename){

	return this.get(bucket, objectId, true).then(function(object){

		return new Promise(function(resolve, reject){

			fs.writeFile(filename, object.content, function(err){

				if(err) return reject(err);
				resolve(true);

			});

		});

	});

};

/*
 * Returns object meta data
 *
 * @param string bucket
 * @param string objectId
 * @return Promise
 */
Client.prototype.getMeta = function(bucket, objectId){

	var opts = this.buildRequestOptions("get", "/" + bucket + "/" + objectId + "/meta");

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {
			
				if(err) return reject(err);
				if(res.statusCode != 200) return reject(body);

				try {

					var resData = JSON.parse(body);
					resolve(resData);

				} catch(e){
					reject(e);
				}
				
			});

		} catch(e){
			reject(e);
		}

	});	

};

/*
 * Delete object
 *
 * @param string bucket
 * @param string objectId
 * @return Promise
 */
Client.prototype.delete = function(bucket, objectId){

	var opts = this.buildRequestOptions("delete", "/" + bucket + "/" + objectId);

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {

				if(err) return reject(err);
				if(res.statusCode != 200) return reject(body);
				
				resolve();

			});

		} catch(e){
			reject(e);
		}

	});	

};

/*
 * Returns object list
 *
 * @param string bucket
 * @return Promise
 */
Client.prototype.listObjects = function(bucket){

	var opts = this.buildRequestOptions("get", "/" + bucket);

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {
			
				if(err) return reject(err);
				if(res.statusCode != 200) return reject(body);

				try {

					var resData = JSON.parse(body);
					resolve(resData);

				} catch(e){
					reject(e);
				}
				
			});

		} catch(e){
			reject(e);
		}

	});	

};

/*
 * Returns bucket list
 *
 * @return Promise
 */
Client.prototype.listBuckets = function(){

	var opts = this.buildRequestOptions("get", "/");

	return new Promise(function(resolve, reject){

		try {

			request(opts, function(err, res, body) {
			
				if(err) return reject(err);
				if(res.statusCode != 200) return reject(body);

				try {

					var resData = JSON.parse(body);
					resolve(resData);

				} catch(e){
					reject(e);
				}
				
			});

		} catch(e){
			reject(e);
		}

	});	

};

//EXPORT
module.exports = Client;