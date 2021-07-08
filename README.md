# CaptureDevelopment

<p align="center">
    <img alt="Capture Logo" title="Capture Logo" src="https://i.imgur.com/XPvMO12.png">
</p>

<p align="center">
    This repository houses the source code for the <a href="https://chrome.google.com/webstore/detail/capture/egjcclpcljpdolmileljdlacgihomfbf?authuser=2">Google Chrome extension Capture</a>.
</p>
<p align="center">    
  Capture lets you save your tabs away, along with notes, for future use. It also has a tagging system, so that you can easily filter through your notes. <a href="https://i.imgur.com/ogx4vMw.gif">Here's a gif of Capture in action.</a>
</p>
      
## To download and install the development version of Capture:     
    
1. Click "Clone or Download" and download a ZIP of the repository.     
2. Extract the ZIP to whatever folder you please.  
3. Open Google Chrome.   
4. Click the three dots in the upper right hand corner of Chrome, and click Settings.    
5. Click the Hamburger Icon in the top-left corner, then click "Extensions".
6. Select "Load unpacked".   
7. Navigate to where you extracted the ZIP file. Select the folder (the entire thing) and press OK.   
8. Congratulations! You have now installed the development version of Capture. 
      
## How Capture works     
        
Capture is essentially a tab manager + note taker. I had the idea for it when I realized I always had way too many tabs open in Chrome. However, I didn't just want to close the tabs, because they often had something notable in them (e.g., an interesting fact, something about computers that I wanted to remember, etc etc etc). So my idea was to make an extension where I could save a tab away, along with a note summarizing whatever I wanted to remember about the site. I figured this would be a great way to learn too, since I've always found that trying to summarize and explain a topic is a great way to internalize it. Finally, I also wanted the extension to have a tagging system.   
       
       
This is what Capture does. When you are on a site, you can press Alt+S or click the extension's icon to open a dialog box that looks like [this](https://i.imgur.com/END0jB0.png). Here is where you enter your note about the site, along with any tags you want (prefaced by a #). You then click Save. I am calling each site+note combination a "snip".   
       
   
You can then hit the Open Snips button to get [this](https://i.imgur.com/Fda8pkq.png). This is the main UI of the extension, where you can see all your snips, filter by tags, read over and edit your notes, delete a snip, and reopen the site you took the snip on (the titles are clickable links). There is also an "Export all Snips" button so your notes never get "stuck" in the extension. The sidebar is fixed: the main part of the page is where you can scroll through all your snips.   
     
      
One last thing to note: the tag system. Filtering by a tag works by clicking on a tag in the sidebar, which toggles the tag on and shows only the snips with that tag, [like so](https://i.imgur.com/1aA49xQ.png). You can also click on multiple tags to show a union of snips: i.e., if the prog and css tags are on, then it will show both the snips with the prog tag and the snips with the css tag, [like this](https://i.imgur.com/SIqCgqI.png).
     
## Code explanation   
           
In order to get new devs up to speed as fast as possible, I will now give an overview of the code. My hope is that this can help anyone who may want to contribute. Any by the way -- thanks in advance if you do decide to contribute! I appreciate all Pull requests or Issues.           
   
Chrome extensions are basically zipped bundles of HTML, CSS, and JS. They also contain a `manifest.json` file that tells Chrome some basic info about the extension. See [here](https://developer.chrome.com/extensions) for more about them -- any web developer could build one.                 
      
Capture also uses [PouchDB](https://pouchdb.com/guides/) as a database. PouchDB is a NoSQL database, meaning it stores data in unstructured documents. A document can basically be any JS object, BUT they are required to have an `_id` field. The `_id` field is used to retrieve the document from the database. Essentially (as far as I understand) PouchDB is a very nice wrapper API for "lower level" database technologies, like IndexedDB. It can also do some handy stuff like keeping remote databases in sync with a local one, although this extension doesn't do any of that. Capture just uses the local storage on your machine. It is also worth noting the [PouchDB API](https://pouchdb.com/api.html#batch_create) is asynchronous.     
         
Speaking of databases, here are how the two databases the extension uses are set up:   
       
#### 1. The `dbForSnips` database   
This database stores Snip objects. Snips are note+site combos. Each snip object has the following properties:         
      
| **Property**  | **Type** | **Description**                                                                                   |
|---------------|----------|---------------------------------------------------------------------------------------------------|
| `._id`        | string   | date of when the snip was created, and also the unique id used to retrieve the snip out of the DB |
| `.url`        | string   | URL of the site the snip was created on                                                           |
| `.title`      | string   | title of the site the snip was created on                                                         |
| `.favIconUrl` | string   | the URL of the favicon of the site the snip was created on                                        |
| `.snipText`   | string   | the note associated with the snip                                                                 |
| `.tags`       | array    | an array of all the tags in the snip<sup>1</sup>.                                                 |
       
<sup>1</sup>. Each tag is stored as a string, and the hashtag is removed. Further, only unique tags are stored. Thus, a `.snipText` of this: "#foo #foo #bar" would result in `.tags` being `["foo", "bar"]`.     
       
   
#### 2. The `dbForTags` database   
My idea here is that I wanted to keep a database that keeps a [tag]-->[array of snip ids with that tag] mapping, so that it would be easy to look up snips with a certain tag. This is what this second database does; its objects are structured like so:         
      
| **Property**  | **Type** | **Description**                                                                                   |
|---------------|----------|---------------------------------------------------------------------------------------------------|
| `._id`        | string   | a tag, and of course the unique id used to get this object from the database |
| `.snipsWithThisTag`        | array   | an array of all the .id's of the snips with this tag                                          |
   
   
         
I figure from here on out the easiest way to explain the code would just be to go file by file.   
         
`manifest.json` is just the manifest file for the extension; nothing too interesting here.   
         
`Snip.js` is a simple file defining a Snip object. **dbForSnips** stores Snip objects; so the class defines the exact same structure as I gave above for the **dbForSnips** database.  
     
`DB.js` is the first substantial part of the extension's codebase -- there will be two.  
It declares one class -- called `DB` -- that provides the entire extension its data store. In other words: all the extension's database access goes through this class. Other files link up to this database class (e.g. `const db = new DB()`), and then make calls like db.saveSnip() or db.deleteSnip() to save or delete a snip, respectively.   
The DB class maintains two databases: **dbForSnips**, and **dbForTags**. These are the exact same databases described above. It has 7 methods: saveSnip(), updateSnipText(), deleteSnip(), getSnip(), allSnips(), getTag(), and allTags(). A large portion of the code in those methods is devoted to keeping the two databases in sync. Again, all database access goes through this class: those methods are the interface the extension uses to manipulate its state.
          
The [`/popup`](https://github.com/nameEqualsJared/CaptureDevelopment/tree/master/popup) folder contains all the code for the [aforementioned popup / dialog box](https://i.imgur.com/END0jB0.png). `popup.html` and `popup.css` define the layout and styling of the box, respectively. `popup.js` contains the code used to save snips: this file mainly just gets some info about the current page, like the title and url, and then makes a call to `db.saveSnip()`. The code regrettably uses a global variable, but I tried to be clear about exactly when and where it will be updated. I couldn't think of a more elegant solution to the "user may click save multiple times on a page, but only one snip should be saved" problem. Any suggestions are welcome for eradicating this annoyance.    
       
The [`/mainUI`](https://github.com/nameEqualsJared/CaptureDevelopment/tree/master/mainUI) folder comprises the main UI of the extension --  the one seen [here](https://i.imgur.com/Fda8pkq.png). `mainUI.html` and `mainUI.css` again define the layout and styling of the page, as you may expect. `mainUI.js` is the second substantial part of the extension's codebase. This is what renders all the snips into the page, and keeps the tags up to date on the side, whilst also adding in the tag filter functionality. This file defines two classes, `MainUI` and `TagUI`, which are used to implement this functionality. The MainUI class defines the scrollable snip feed in the center of the page. The TagUI class defines the tags on the left. These classes are (regrettably) coupled together; i.e., each class holds a reference to the other. I believe this is necessary though, because changes in the TagUI need to affect the MainUI, and changes in the MainUI need to affect the TagUI.
          
Lastly, `contact.html`, `export.html`, and `export.js` are all just in there to make the Export All Snips and Contact buttons on the Main UI work (they just open those pages).   
        
As a hopefully helpful final picture, here is a diagram of the three main classes mentioned above:  
     
![Diagram of three main classes in Capture codebase](https://i.imgur.com/WnFcir5.png)

            
## Acknowledgements   
         
My many thanks [to the people over on r/learnprogramming](https://www.reddit.com/r/learnprogramming/comments/aggpbp/just_finished_my_first_chrome_extension_and_would/) who reviewed this code! I appreciate it immensely.    
     
Also, shoutout to my awesome sister for the logo.

