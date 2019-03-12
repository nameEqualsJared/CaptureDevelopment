//linking up all the buttons
const saveButton = document.getElementById("saveButton");
const openSnipsButton = document.getElementById("openSnipsButton");

//linking up to the data store
const db = new DB();


function saveANewSnip() {
	//NOTE: this function modified a global variable! Specifically, it will put the id of the snip that it saves in the "idOfSnipIfAlreadySaved" global!

	//get the current snip text given by the user
	const currentSnipText = document.getElementById("inputText").value;

	//get the current page title and address
	chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
		// Note: I cannot use a more modern async JS technique above, as all chrome extension APIs only currently support the traditional callback technique.
		// Note that the callback function above must be declared async, as we use await below

		const currentURL = tabs[0].url;
		const currentTitle = tabs[0].title;
		const currentFavIconUrl = tabs[0].favIconUrl;

		let tags = [];
		const tagArrayWithHashtags = currentSnipText.match(/(#[0-9a-zA-z-]+)/g); //this re just matches all the tags in the sniptext (including hashtags)
		if (tagArrayWithHashtags) {
			//if the tagArrayWithHashtags exists (not null)
			for (let tag of tagArrayWithHashtags) {
				tags.push(tag.slice(1));
				//simply add the tags to the array, with the hashtags removed
			}
		}
		let uniqueTags = [...new Set(tags)]; // we only want to store the unique tags -- don't care about duplicates in the snipText.

		const idOfSnipSaved = await db.saveSnip(currentURL, currentTitle, currentFavIconUrl, currentSnipText, uniqueTags);

		//push the _id of the currently saved snip into the global
		idOfSnipIfAlreadySaved.push(idOfSnipSaved);

	});

}


// GLOBAL VARIABLE (regrettably)
idOfSnipIfAlreadySaved = [];
//above is meant to be a global. Will only ever hold one element; the id of the snip if one has been saved on this page. This is updated by the saveANewSnip() function and checked in the onclick saveButton event handler below -- these are the only two places the global is used. I use it to solve the problem of "the user may click save multiple times, but only one snip should be saved per page."

saveButton.onclick = async function () {
	// NOTE: this functiosn references of the idOfSnipIfAlreadySaved global!

	if (idOfSnipIfAlreadySaved.length === 0) {
		//no snips have been saved yet. (ie, this is the first time the save button has been pushed) 
		saveANewSnip();

	} else {
		//One snip has been saved so far.
		const idOfOldSnip = idOfSnipIfAlreadySaved[0];

		try {
			let doc = await DB.getSnip(idOfOldSnip);

			//check if the snipText has changed (don't want to do anything if it hasn't)
			if (doc.snipText !== document.getElementById("inputText").value) {
				//the snipText has changed.

				//delete the old snip 
				DB.deleteSnip(idOfOldSnip);

				//clear this out; we'll be saving a new snip.
				idOfSnipIfAlreadySaved.pop();

				saveANewSnip();
				// recall that saveANewSnip() will mutate the global variable! I.e., it will put the id of the snip it saves into the global variable
			}
		} catch (err) {
			console.log(err)
		}

	}

}


openSnipsButton.onclick = function () {

	chrome.tabs.create({ url: "mainUI.html" });

}