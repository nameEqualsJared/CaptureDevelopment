//this module provides a common function to popup.js and snips.js

function deleteSnip(snip) {
	//snip -- the document to be removed (the whole thing; not just the id);

	//this function properly deletes a snip: that is, not only does it remove it from the dbForSnips, but it also clears its id out of any tags in dbForTags. 

	let dbForSnips = new PouchDB("dbForSnips");
	let dbForTags = new PouchDB("dbForTags");

	//For each tag in this snip, go into the dbForTags, and get out the snipsWithThisTag array for each tag. Remove this snip's id; we are deleting it.
	for (let tag of snip.tags) {
		dbForTags.get(tag, function (err, doc) {
			if (err) {
				console.log(err);
			} else {
				let snipsWithThisTag = doc.snipsWithThisTag;

				//remove the id from the snipsWithThisTag array (cause we are deleting the snip)
				let index = snipsWithThisTag.indexOf(snip._id);
				if (index > -1) {
					snipsWithThisTag.splice(index);
				}


				if (snipsWithThisTag.length === 0) {
					//no more snips exist with this tag. So just delete the whole entry in dbForTags.
					dbForTags.remove(doc);

					// rerender all the snips in the sidebar. This function must be called here, as the async stuff above has to be done before it. Thus, we couldn't put it below otherwise it'd be called too early (without the dbForTags being updated), because sync stuff always gets executed first!
					console.log("STARTING");
					setUpSideTags();


				} else {
					//otherwise update the entry
					dbForTags.put(doc);

				}

			}

		});
	}

	//delete this snip from dbForSnips
	dbForSnips.remove(snip, function (err) { if (err) { console.log(err); } });

}