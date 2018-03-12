const chokidar = require('chokidar');
const tesseract = require('node-tesseract');
const vision = require('@google-cloud/vision');
const {google} = require('googleapis');
const customsearch = google.customsearch('v1');

const DESKTOP = "C:\\Users\\austinn\\Desktop";

//api key from google for custom search
const API_KEY = '';
const watcher = chokidar.watch(DESKTOP, {ignored: /^\./, persistent: true, ignoreInitial: true});

//service key from google for google vision api
const client = new vision.ImageAnnotatorClient({keyFilename: './credentials.json'});

let answerCount = [0, 0, 0];
let startTime = 0;
let endTime = 0;

watcher.on('add', function(path) {
	startTime = new Date().getTime();
	console.log("added: " + path);
	//cloudVisionOcr(path);
	tesseractOcr(path);
});

//performSearch('Stradivarius was famous for making what?', ['spotify', 'violins', 'hearing aids']);

function tesseractOcr(path) {
	
	tesseract.process(path ,function(err, text) {
		if(err) {
			console.error(err);
		} else {
			let question = getQuestion(text);
			let answers = getAnswers(text);

			console.log('Question: ' + question.replace('\n', ' '));

			// let endTime = new Date().getTime();
			// var totalTime = (endTime - startTime) / 1000;
			// console.log("Tesseract: " + totalTime);

			performSearch(question, answers);
		}
	});
}

function cloudVisionOcr(path) {
	client
		.textDetection(path)
		.then(results => {
			const detections = results[0].textAnnotations;
			let detection = detections[0].description;

			let question = getQuestion(detection);
			let answers = getAnswers(detection);

			console.log('Question: ' + question.replace('\n', ' '));

			// let endTime = new Date().getTime();
			// var totalTime = (endTime - startTime) / 1000;
			// console.log("Google Cloud Vision: " + totalTime);
			
			performSearch(question, answers);
		}).catch(err => {
			console.error('ERROR:', err);
		});
}

function performSearch(question, answers) {
	customsearch.cse.list({
		cx: '012367277383467796256:vp3bpzbcwmw',
		q: question,
		auth: API_KEY
	}, (err, res) => {
		if (err) {
			throw err;
		}

		let results = res.data.items;
		for(var i = 0; i < 10; i++) {
			searchSnippet(results[i].snippet, answers);
		}

		for(var i = 0; i < answerCount.length; i++) {
			console.log(answers[i] + ": " + answerCount[i]);
		}

		var highest = answerCount[0];
		var highestPos = 0;
		for(var i = 0; i < answerCount.length; i++) {
			if(answerCount[i] > highest) {
				highest = answerCount[i];
				highestPos = i;
			}
		}

		console.log("Best Answer: " + answers[highestPos]);
		endTime = new Date().getTime();

		let totalTime = (endTime - startTime) / 1000;
		console.log("time: " + totalTime);

		answerCount = [0, 0, 0];
	});
}

function searchSnippet(snippet, answers) {
	snippet = snippet.toLowerCase();
	snippet = snippet.replace(/[^a-z]/g, ' ');

	var snippetArray = snippet.split(' ');
	snippetArray.forEach(word => {
		if(word === answers[0].toLowerCase()) {
			answerCount[0] += 1;
		} else if(word.toLowerCase() === answers[1].toLowerCase()) {
			answerCount[1] += 1;
		} else if(word.toLowerCase() === answers[2].toLowerCase()) {
			answerCount[2] += 1;
		}
	});
}

function getQuestion(detection) {
	let index = detection.indexOf('?');

	return detection.substring(0, index + 1);
}

function getAnswers(detection) {
	let index = detection.indexOf('?');
	let length = detection.length;

	let answerString = detection.substring(index + 1, length);
	let answerArray = answerString.split('\n');
	let answers = [];
	 
	answerArray.forEach(element => {
		if(element !== '') {
			answers.push(element);
		}
	});

	return answers;
}