// utility function, used in updateSnipText in the class below
function arraysEqual(a, b) {
    //credit to enyo on SO for the function.
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    let aSorted = a.sort();
    let bSorted = b.sort();

    for (var i = 0; i < aSorted.length; ++i) {
        if (aSorted[i] !== bSorted[i]) return false;
    }
    return true;
}


class DB {
    /* 
    This class encapsulates all database access that the extensions makes. In essence, it provides the extension its data store.
    
    It maintains two separate databases: dbForSnips and dbForTags. How these databases are set up is described in the "Code explanation" section of the Readme. In short though: 
        Both databases store JS objects. Each object is required to have a unique _id field to retrieve it from the database. The _id field is a string.
        dbForSnips stores "Snip" objects as defined by Snip.js. The _id of Snip objects is also the date the snip was saved. 
        dbForTags is used to store a tag --> [id of snips with this tag] mapping. It's objects have two fields: _id, which is the tag, and snipsWithThisTag, which is an array of id's of snips with this tag.

    It provides the following 7 methods in its interface:       
        saveSnip(url, title, favIconUrl, snipText, tags)
            Saves a new snip. Keeps both dbForSnips and dbForTags in sync (i.e., up to date).
            Returns a Promise<string>, where the result of the promise is the _id of the snip (also the date the snip was saved). 

        updateSnipText(snip, newSnipText)
            Updates the passed snip with the newSnipText. Keeps both dbForSnips and dbForTags in sync.
            Returns Promise<void>.

        deleteSnip(_id)
            Deletes the snip with the given _id from dbForSnips. Keeps both dbForSnips and dbForTags in sync.
            Returns Promise<void>.

        getSnip(_id)
            Retrieves the snip with the given _id from dbForSnips. 
            Returns a Promise<object>, where the result of the promise is the Snip object.

        allSnips()
            Retrieves all the snips in storage from dbForSnips.
            Returns a Promise<object>, where the result of the promise is an array of all Snips in dbForSnips.

        getTag(_id)
            Retrieve the tag-snipsWithThisTag pairing with the given _id from dbForTags. Recall that the _id is the tag.
                That is, if _id = "foo", this function will retrieve the object {_id: "foo", snipsWithThisTag: [array of ids of all snips with tag "foo"]}
            Returns a Promise<object>, where the result of the promise is the tag-snipsWithThisTag object.

        allTags()
            Retrieves all the tag-snipsWithThisTag pairings in dbForTags.
            Returns a Promise<object>, where the result of the promise is an array of all tag-snipsWithThisTag objects in dbForTags.

    Currently, this class uses PouchDB as its database technology, though this could be viewed as an implementation detail.

    This class is included for two reasons:
        1. It reduces complexity in the UI code, by providing a simplified interface to interact with the database/data store in the extension. That is, it abstract away complexity. Specifically the first three methods above do this, because they keep both databases in sync as they work (e.g., when a snip is deleted, both dbForSnips and dbForTags needs to be updated -- this complexity is abstracted away).

        2. It reduces the extension's dependency on PouchDB. Before this class's creation, I had references to PouchDB all over the place. If PouchDB even went under / had a non-backwards compatible update / went paid or whatever, I would of course have to switch database technologies. But since my extension had references to PouchDB all over the place, that would be A TON of work. However, now with this class, I would need only reimplement the interface defined above with a different database solution -- then I would be DONE. This is obviously a huge win. By encapsulating database access, not only do I get a more simplified interface, but I improve future maintability.
        Thanks to u/VolitiveGibbon on the code review post for advising me to do this.
    */

    constructor() {
        // These initializations will either create new databases (if it's the first time the extension has been used) or link back up to already existing ones.
        this.dbForSnips = new PouchDB("dbForSnips");
        this.dbForTags = new PouchDB("dbForTags");
    }


    async saveSnip(url, title, favIconUrl, snipText, tags) {
        /*
        url, title, favIconUrl, snipText, and tags: these parameters are those described in Snip.js / in the Readme. 
        They are what you would expect; url is the url of the page, title the title of the page, etc.
        
        This method creates and saves a new snip. 
        It updates both dbForSnips and dbForTags to do this. Specifically, it 
            1) saves the snip's id to all of its tags in dbForTags
            AND
            2) saves the snip object itself in dbForSnips
        
        This method returns a Promise<string>, where the result of the promise is the _id of the snip saved.
        */

        //getting the final field needed to create and save a new snip: the _id. Holds the date of when this snip was created and acts as unique identifier to retrieve the snip in PouchDB.
        const _id = new Date().toLocaleString();

        //Constructing the new snip.
        const currentSnip = new Snip(_id, url, title, favIconUrl, snipText, tags);

        //saving this snip to all of its tags in dbForTags
        for (let tag of currentSnip.tags) {
            try {
                const doc = await this.dbForTags.get(tag);
                // if we reach here, an entry for this tag already exists in dbForTags
                //thus, we get the snipsWithThisTag array out, add on the current snip, and save it back 
                let snipsWithThisTag = doc.snipsWithThisTag;
                snipsWithThisTag.push(currentSnip._id);
                this.dbForTags.put(doc).catch(err => console.log(err));

            } catch (err) {
                if (err.message === "missing") {
                    //this error means an entry for this tag doesn't exist in dbForTags (i.e., the tag is new) 
                    //thus, we create it
                    this.dbForTags.put({ _id: tag, snipsWithThisTag: [currentSnip._id] }).catch(err => console.log(err));
                } else {
                    console.log(err);
                }
            }
        }

        //saving the Snip in the dbForSnips
        this.dbForSnips.put(currentSnip).catch(err => console.log(err));

        return _id;
    }


    async updateSnipText(snip, newSnipText) {
        /*
        snip: a full snip object, required to have atleast the _id, snipText, and tags fields for this function to work
        newSnipText: the newSnipText for the passed snip. 

        This method properly updates both databases given a snip and a newSnipText for that snip. Specifically, it
            1) Handles the addition or deletion of any tags in the newSnipText, properly updating dbForTags
            AND
            2) updates the snip itself by updating the tag and snipText fields, and saving the snip back in dbForSnips
        
        This method returns Promise<void>.
        */


        // ------ Step 1: update the dbForTags --------
        // retrieve all the unique tags from the newSnipText (remove duplicates)
        let tagArrayWithHashtags = newSnipText.match(/(#[0-9a-zA-z-]+)/g);
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
                        let doc = await this.dbForTags.get(tag);
                        doc.snipsWithThisTag.splice(doc.snipsWithThisTag.indexOf(snip._id), 1);
                        if (doc.snipsWithThisTag.length === 0) {
                            // no more snips with this tag (i.e., this was the last one)
                            // thus, just delete the whole entry in dbForTags
                            this.dbForTags.remove(doc).catch(err => console.log(err));
                        } else {
                            // otherwise just update this entry in dbForTags
                            this.dbForTags.put(doc).catch(err => console.log(err));
                        }
                    } catch (err) {
                        console.log(err);
                    }
                }
            }

            // For each tag in newTags, add this snip's ID to that tag's entry in dbForTags
            for (let tag of newTags) {
                try {
                    let doc = await this.dbForTags.get(tag);
                    // add this snip's ID to this tag's entry in dbForTags (if it's not already there), and update the db
                    if (doc.snipsWithThisTag.indexOf(snip._id) === -1) {
                        doc.snipsWithThisTag.push(snip._id);
                    }
                    this.dbForTags.put(doc).catch(err => console.log(err));
                } catch (err) {
                    if (err.message === "missing") {
                        // this means that we have a new tag. Thus, create a new entry for it in dbForTags :)
                        this.dbForTags.put({ _id: tag, snipsWithThisTag: [snip._id] }).catch(err => console.log(err));
                    } else {
                        console.log(err);
                    }
                }
            }

        }

        // ------ Step 2: update the dbForSnips ------
        snip.snipText = newSnipText;
        snip.tags = newTags;
        this.dbForSnips.put(snip).catch(err => console.log(err));
    }


    async deleteSnip(_id) {
        /*
        _id: the id of the snip to be removed.
    
        This method properly deletes a snip, by keeping both databases in sync. 
        Specifically, it 
            1) clears the snips id out of any tag in dbForTags, 
            AND
            2) deletes the snip from dbForSnips

        Method returns a Promise<void>
        */

        try {
            const snip = await this.dbForSnips.get(_id);

            //For each tag in this snip, go into the dbForTags, and get out the snipsWithThisTag array for each tag. Remove this snip's id; we are deleting it.
            for (let tag of snip.tags) {

                let doc = await this.dbForTags.get(tag);
                const snipsWithThisTag = doc.snipsWithThisTag;

                //remove the id from the snipsWithThisTag array (cause we are deleting the snip)
                let index = snipsWithThisTag.indexOf(snip._id);
                if (index > -1) {
                    snipsWithThisTag.splice(index, 1);
                }

                if (snipsWithThisTag.length === 0) {
                    // no more snips exists with this tag. So just delete the whole entry in dbForTags.
                    this.dbForTags.remove(doc).catch(err => console.log(err));

                } else {
                    // otherwise update the entry in dbForTags
                    this.dbForTags.put(doc).catch(err => console.log(err));
                }
            }

            //delete this snip from dbForSnips
            this.dbForSnips.remove(snip).catch(err => console.log(err));

        } catch (err) {
            console.log(err);
        }
    }

    async getSnip(_id) {
        /*
        _id: the _id of the snip to retrieve from dbForSnips.
        Method returns a Promise<object>, where the result of the promise is the snip object being retrieved.
        */
        return this.dbForSnips.get(_id);
    }

    async allSnips() {
        /*
        Method returns a Promise<object>, where the result of the promise is an array of all snip objects in dbForSnips.
        */
        return this.dbForSnips.allDocs({ include_docs: true, descending: true });
    }

    async getTag(_id) {
        /*
        _id: the _id (the tag) of the tag-snipsWithThisTag pairing to retrieve from dbForTags.
        Method returns a Promise<object>, where the result of the promise is the tag-snipsWithThisTag object being retrieved.
        */
        return this.dbForTags.get(_id);
    }

    async allTags() {
        /*
        Method returns a Promise<object>, where the result of the promise is an array of all tag-snipsWithThisTag objects in dbForTags.
        */
        return this.dbForTags.allDocs({ include_docs: true, descending: true });
    }

    // UTILITY, DO REMOVE!
    destroy() {
        db.dbForSnips.destroy();
        db.dbForTags.destroy();
    }

    // Utility, DO REMOVE!
    async describe() {
        console.log("------------\n Contents of dbForSnips follows: ");
        let allSnips = await this.allSnips();
        for (let snip of allSnips.rows) {
            console.log(JSON.stringify(snip));
        }
        console.log("------------\n Contents of dbForTags follows: ");
        let allTags = await this.allTags();
        for (let tagPairing of allTags.rows) {
            console.log(JSON.stringify(tagPairing));
        }
    }

}