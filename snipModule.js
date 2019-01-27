//this module provides a common function to popup.js and snips.js: deleteSnip.

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
				snipsWithThisTag.splice(index, 1);
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
