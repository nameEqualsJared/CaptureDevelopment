//this module provides 2 common function to popup.js and snips.js

async function deleteSnip(snip) {
	//snip -- the document to be removed (the whole thing; not just the id);

	//this function properly deletes a snip: that is, not only does it remove it from the dbForSnips, but it also clears its id out of any tags in dbForTags. 

	const dbForSnips = new PouchDB("dbForSnips");
	const dbForTags = new PouchDB("dbForTags");

	//For each tag in this snip, go into the dbForTags, and get out the snipsWithThisTag array for each tag. Remove this snip's id; we are deleting it.
	for (let tag of snip.tags) {

		let doc = await dbForTags.get(tag);
		try {
			const snipsWithThisTag = doc.snipsWithThisTag;

			//remove the id from the snipsWithThisTag array (cause we are deleting the snip)
			let index = snipsWithThisTag.indexOf(snip._id);
			if (index > -1) {
				snipsWithThisTag.splice(index);
			}

			if (snipsWithThisTag.length === 0) {
				// no more snips exists with this tag. So just delete the whole entry in dbForTags.
				dbForTags.remove(doc).catch(err => console.log(err));

				// rerender all the snips in the sidebar (function is defined in setUpSideTags()). This function must be called here, as the async stuff above has to be done before it. Thus, we couldn't put it below otherwise it'd be called too early (without the dbForTags being updated), because sync stuff always gets executed first!
				// setUpSideTags();
				// could take out later if performance becomes a problem, because a simple page reload will also update the tags on the left. But this makes it a little more responsive though.

			} else {
				// otherwise update the entry in dbForTags
				dbForTags.put(doc).catch(err => console.log(err));
			}
		} catch (err) {
			console.log(err);
		}

	}
	//delete this snip from dbForSnips
	dbForSnips.remove(snip).catch(err => console.log(err));
}

async function updateSnipText(snip, newSnipText) {
	/*
		snip -- a full snip object, required to have atleast the _id, snipText, and tags fields for this function to work 

		This function properly updates the tags and snipText of a snip, given a newSnipText. That is, it keeps both the databases up to date, in that it:
		1) Handles the addition or deletion of any tags in the newSnipText, properly updating dbForTags
		2) updates the snip itself by updating the tag and snipText fields, and saving the snip back in dbForSnips
	*/

	// ------ Step 1: update the dbForTags --------

	// retrieve all the unique tags from the newSnipText (remove duplicates)
	let tagArrayWithHashtags = newSnipText.match(/(#[1-9a-zA-z-]+)/g);
	let newTagsWDups = [];
	if (tagArrayWithHashtags) {
		//if the tagArrayWithHashtags exists (not null)
		for (let tag of tagArrayWithHashtags) {
			newTagsWDups.push(tag.slice(1));
			//simply add the tags to the array, with the hashtags removed
		}
	}
	let newTags = [...new Set(newTagsWDups)]; // newTags is an array of all the unique tags in the newSnipText

	let oldTags = snip.tags; // these are the tags previously saved in the snip

	// only run the code to update the tags if the oldTags != newTags.
	if (!arraysEqual(oldTags, newTags)) {

		// For each tag in the old tags, if the tag is no longer present, remove the snips's ID from that tag's entry in dbForTag
		for (let tag of oldTags) {
			if (newTags.indexOf(tag) === -1) {
				// So this tag is no longer present

				// Thus, we remove this snip's id from that tag's entry in dbForTags
				try {
					let doc = await dbForTags.get(tag);
					doc.snipsWithThisTag.splice(doc.snipsWithThisTag.indexOf(snip._id));
					if (doc.snipsWithThisTag.length === 0) {
						// no more snips with this tag (i.e., this was the last one)
						// thus, just delete the whole entry in dbForTags
						dbForTags.remove(doc).catch(err => console.log(err));
					} else {
						// otherwise just update this entry in dbForTags
						dbForTags.put(doc).catch(err => console.log(err));
					}
				} catch (err) {
					console.log(err);
				}
			}
		}

		// For each tag in newTags, add this snip's ID to that tag's entry in dbForTags
		for (let tag of newTags) {
			try {
				let doc = await dbForTags.get(tag);
				// add this snip's ID to this tag's entry in dbForTags (if it's not already there), and update the db
				if (doc.snipsWithThisTag.indexOf(snip._id) === -1) {
					doc.snipsWithThisTag.push(snip._id);
				}
				dbForTags.put(doc).catch(err => console.log(err));
			} catch (err) {
				if (err.message === "missing") {
					// this means that we have a new tag. Thus, create a new entry for it in dbForTags :)
					dbForTags.put({ _id: tag, snipsWithThisTag: [snip._id] }).catch(err => console.log(err));
				} else {
					console.log(err);
				}
			}
		}

	}

	// ------ Step 2: update the dbForSnips ------
	snip.snipText = newSnipText;
	snip.tags = newTags;
	dbForSnips.put(snip).catch(err => console.log(err));

}