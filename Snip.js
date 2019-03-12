// defining a new object: the Snip. Snips are the objects used to to store note-site combos -- they are also what the dbForSnips stores in DB class.
class Snip {
    constructor(_id, url, title, favIconUrl, snipText, tags) {
        this._id = _id; //A string with the date of when the snip was created. Also the unique ID used to save the snip in the DB
        this.url = url; // string 
        this.title = title; // string 
        this.favIconUrl = favIconUrl; // string 
        this.snipText = snipText; // string
        this.tags = tags; //an array of all the tags contained in the snupText
    }
}

