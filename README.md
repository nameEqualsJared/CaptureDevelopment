# CaptureDevelopment
This repository houses the source code for the [Google Chrome extension Capture](#). It is currently in development.   
      
       
## To download the extension and get it working on your system:     
    
1. Click "Clone or Download" and download a ZIP of the project.     
2. Extract the ZIP to whatever folder you please.  
3. Open Google Chrome.   
4. Click the three dots in the upper right hand corner of Chrome, and click Settings.   
5. Select "Load unpacked extension..."   
6. Navigate to where you extracted the ZIP file. Select the folder (the entire thing) and press OK.   
7. Congratulations! You have now installed the development version of Capture. 
      
## How Capture works     
        
Capture is essentially a tab manager + note taker. I had the idea for it when I realized I always had way too many tabs open in Chrome. However, I didn't just want to close the tabs, because they often had something notable in them (e.g., an interesting fact, something about computers that I wanted to remember, etc etc etc). So my idea was to make an extension where I could save a tab away, along with a note summarizing whatever I wanted to remember about the site. I figured this would be a good way to learn too, cause I've always found trying to summarize and explain topics a great way to internalize them. [Shout out to Mr. Feynman](https://fs.blog/2012/04/learn-anything-faster-with-the-feynman-technique/)! I also wanted there to be a tag system.   
       
       
This is what Capture does. When you are on a site, you can press Alt+S or click the extension's icon to open a dialog box that looks like [this](https://i.imgur.com/END0jB0.png). Here is where you enter your note about the site, along with any tags you want (prefaced by a #). You then click Save. I am calling each site+note combination a "snip".   
       
   
You can the hit the Open Snips button to get [this](https://i.imgur.com/Fda8pkq.png). This is the main UI of the extension, where you can see all your snips, filter by tags, read over and edit your notes, delete a snip, and reopen the site you took the snip on (the titles are clickable links). There is also an "Export all Snips" button so your notes never get "stuck" in the extension. The side is fixed: the main part of the page is where you can scroll through all your snips.   
     
      
One last thing to note: the tag system. Filtering by a tag works by clicking on the tag in the sidebar, toggling it on and showing only the snips with that tag, [like so](https://i.imgur.com/1aA49xQ.png). You can also click on multiple tags to show a union of snips: i.e., if the prog and css tags are on, then it will show both the snips with the prog tag and the snups with the css tag, [like this](blob:https://imgur.com/5ea042e9-9c07-4359-ab2e-a44b6879ecc8).
     
## Code explanation   
           
In order to get new devs up to speed as fast as possible, I will now give an overview of the code. My hope is that this can help anyone who may want to contribute. Any by the way -- thanks in advance if you do decide to contribute! I appreaciate all pull requests or issues.           
   
Chrome extensions are basically zipped bundles of HTML, CSS, and JS. They also contain a `manifest.json` file that tells Chrome some basic info about the extension. See [here](https://developer.chrome.com/extensions) for more about them -- any web developer could build one.                 
      
Capture also uses [PouchDB](https://pouchdb.com/guides/) as a database. PouchDB is a NoSQL database, meaning it stores data in unstructured documents. A document can basically be any JS object, BUT they are required to have an `_id` field. The `_id` fields is used to retrieve the document from the database. Essentially (as far as I understand) PouchDB is a very nice wrapper API for "lower level" database technologies, like IndexedDB. It can also do some handy stuff like keeping databases in sync, although this extension doesn't so any of that. Capture just uses local storage on your machine. It is also worth noting the [PouchDB API](https://pouchdb.com/api.html#batch_create) is asynchronous.     
         
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
       
<sup>1</sup>. Each tag is stored as a string, and the hashtag is removed. Further, only unique tags are stored. Thus, a `.snipText` like this: "#foo #foo #bar" would results in `.tags` being `["foo", "bar"]`.     
       
   
#### 2. The `dbForTags` database   
My idea her is that I wanted to keep a database that keeps a [tag]-->[array of snip ids with that tag] mapping, so that it would be easy to look up snips with a certain tag. This is what this second database does; its objects are structured like so:         
      
| **Property**  | **Type** | **Description**                                                                                   |
|---------------|----------|---------------------------------------------------------------------------------------------------|
| `._id`        | string   | a tag, and of course the unique id used to get this object from the database |
| `.url`        | array   | an array of all the .id's of the snips with this tag                                          |
   
   
         
I figure from here on out the easiest way to explain the code would just be to go file by file.   
         
`manifest.json` is just the manifest file for the extension; nothing too interesting here.   
      
`popup.html` and `popup.css` define the layout and styling of the [aforementioned popup / dialog box](https://i.imgur.com/END0jB0.png). `popup.js` contains the code used to save snips, and keep the two databases up to date. This code regrettably uses a global variable, but I tried to be clear about exactly when and where it will be updated. I couldn't think of a more elegant solution to the "user may click save multiple times on a page, but only one snip should be saved" problem. Any suggestions are welcome for eradicating this pest.    
          
`snipModule.js` just defines one function, deleteSnip(), that is used in two different JS files in the extension. As it turns out, deleting a snip is no trivial task, because you have to update the `dbForSnips`, but you also have to keep the `dbForTags` up to date (eg, remove that snips entry from any of it's previous tags). So that's why that is abstracted out.     
          
`snips.html` and `snips.css` define the main UI of the extension, the one seen [here](https://i.imgur.com/Fda8pkq.png). `snips.js` is the main bulk of the extension. This is what renders all the snips into the page, and keeps the tags up to date on the side, whilst also adding in the "tag filter" functionality. This file defines two classes, `TagUI` and `MainUI`, which are used to implement the functionality described above.
          
Lastly, `contact.html`, `export.html`, and `export.js` are all just in there to make the Export All Snips and Contact buttons on the Main UI work (they just open those pages).     

            
## Acknowledgements   
         
My many thanks [to the people over on r/learnprogramming](https://www.reddit.com/r/learnprogramming/comments/aggpbp/just_finished_my_first_chrome_extension_and_would/) who reviewed this code! I appreciate it immensely.

