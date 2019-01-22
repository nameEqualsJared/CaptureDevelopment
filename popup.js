//linking up all the buttons
const saveButton = document.getElementById("saveButton");
const openSnipsButton = document.getElementById("openSnipsButton");

//initializing the DBs (will either create a new one or link back up to the currently existing one)
const dbForSnips = new PouchDB("dbForSnips");
const dbForTags = new PouchDB("dbForTags");

// defining a new object: the Snip. Snips are the objects used to to store note-site combos -- they are also what dbForSnips stores.
class Snip {
	constructor(_id, url, title, snipText, tags) {
		this._id = id; //A string with the date of when the snip was created. Also the unique ID used to save the snip in the DB
		this.url = url;
		this.title = title;
		this.snipText = snipText;
		this.tags = tags; //an array of all the tags contained in the snupText
	}
}


function saveANewSnip() {
	//NOTE: this function modified a global variable! Specifically, it will put the id of the snip that it saves in the "idOfSnipIfAlreadySaved" global!


	//get the current page title and address
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		const currentURL = tabs[0].url;
		const currentTitle = tabs[0].title;

		//"tags" will hold all the tags in the snipText (without hashtags)
		let tags = [];
		const tagArrayWithHashtags = snipText.match(/(#[1-9a-zA-z-]+)/g);
		if (tagArrayWithHashtags) {
			//if the tagArrayWithHashtags exists (not null)
			for (let tag of tagArrayWithHashtags) {
				tags.push(tag.slice(1));
				//simply add the tags to the array, with the hashtags removed
			}
		}

		//_id holds the date of when this snip was created in a string 
		const _id = new Date().toISOString();

		//Constructing the new snip.
		currentSnip = new Snip(_id, currentURL, currentTitle, snipText, tags);


		//saving this snip to all of its tags in dbForTags
		for (let tag of currentSnip.tags) {
			dbForTags.get(tag, function (err, doc) {
				if (err) {
					if (err.message === "missing") {
						//this error means the document doesn't exist. 
						//thus, we create it
						dbForTags.put({ _id: tag, snipsWithThisTag: [currentSnip._id] });

					} else {
						//otherwise, just log the error 
						console.log(err)
					}

				} else {
					// if we reach here, the document exists
					//thus, we get the snipsWithThisTag array out, add on the current snip, and save it back 
					let snipsWithThisTag = doc.snipsWithThisTag;
					snipsWithThisTag.push(currentSnip._id);
					dbForTags.put(doc);
				}

			});
		}

		//saving the Snip in the dbForSnips
		dbForSnips.put(currentSnip, function callback(err, result) {
			if (err) {
				console.log(err);
			}
		});

		//push the _id of the currently saved snip into the global
		idOfSnipIfAlreadySaved.push(_id);

	});

	//get the current snip text given by the user
	const snipText = document.getElementById("inputText").value;

	//Remember that we execute ALL the sync stuff first, and then the async stuff!
	//Thus, the order of execution here is "26" (the function is kicked off but remember it is async!), then 86 (so getting the snipText), then all the stuff inside 26 when it finishes and "calls us back" :) (at which point the snipText will be available!!! That's the key to realize: really the order of execution is more like 86 then when the function calls us back :))


}


// GLOBAL VARIABLE
idOfSnipIfAlreadySaved = [];
//above is meant to be a global. Will only ever hold one element; the id of the snip if one has been saved on this page. This is updated by the saveANewSnip() function and checked in the onclick saveButton event handler below.

saveButton.onclick = function () {

	if (idOfSnipIfAlreadySaved.length === 0) {
		//no snips have been saved yet. (ie, this is the first time the save button has been pushed) 

		saveANewSnip();

	} else {
		//One snip has been saved so far.
		const idOfOldSnip = idOfSnipIfAlreadySaved[0];

		//check if the snipText has changed (don't want to do anything if it hasn't)
		dbForSnips.get(idOfOldSnip, function (err, doc) {
			if (err) {
				console.log(err);
			} else {
				if (doc.snipText !== document.getElementById("inputText").value) {
					//the snipText has changed.

					//delete the old snip 
					deleteSnip(doc);

					//clear this out; we'll be saving a new snip.
					idOfSnipIfAlreadySaved.pop();

					saveANewSnip();
					// recall that saveANewSnip() will mutate the global variable! I.e., it will put the id of the snip it saves into the global variable
				}
			}

		});
	}


};


openSnipsButton.onclick = function () {

	chrome.tabs.create({ url: "snips.html" });

}