# Values-Simplifier
Hello. This program is a tool I've made to help me understand and keep track of values across an image when doing still-lifes. 
Example:

<img width ="500" height="800" src="https://github.com/user-attachments/assets/d228473f-2206-49c8-8f47-e5154219ba79" />
<img width="500" height="800" alt="1-816ccccf5aad5b993269d39f3ed3bb23-2577790819" src="https://github.com/user-attachments/assets/2378ad38-a951-42cb-b16d-3380c2fb2777" />
<br>
It's not perfect, and there are improvements to made to the image processing, but should you want to give feedback or want to change the algo, please feel free to do so.
The following is a general flow of how the program works, but note that this was before i threw the server and python worker into containers as well.
<img width="1100" height="1400" src="https://github.com/user-attachments/assets/17fad36f-30f4-47e8-8ffe-a709d605669d" />

# Note
I've added options to convert your selected image into this particular cat by rearranging the pixels. Please note that the 2nd option takes ~6 minutes, and the 3rd ~3ish minutes.
<img width="1174" height="407" alt="image" src="https://github.com/user-attachments/assets/bd01f340-3be4-4a1f-bbba-b9ae8a06d5ac" />



# INSTALLATION Method 1

You'll need to download/have the following:
<ul>
  <li>An IDE of your choice (ex. vscode)</li>
  <li><a href="https://git-scm.com/install/">Git</a></li>
 <li><a href="https://docs.docker.com/desktop/">Docker</a></li>
</ul>

Then, open your IDE and locate the terminal. 
Then enter the following: <br>
```git clone https://github.com/hearjest/Values-Simplifier.git```
Now, make sure you are in the Values-Simplifier. If not, run: <br>
```cd Values-Simplifier```
Then, please view the ```.env.READMEPLS``` file and follow the instructions to create your credentials. <br>
I know that it's weird to also have a database for logins and whatnot for a personal tool, but I would like to host it as a website. <br>
Once you finish what is outlined in ```.env.READMEPLS```, now run: <br>
```docker compose pull``` <br>
```docker compose up -d```

# FILE STRUCTURE
The main folders you will be looking at is the Values-Simplifier folder, and the subdirectories back and front.

### Values-Simplifier
Here you'll find the docker files and the init.sql file. Should you delete the DB, you can use init.sql as a backup, for the schemas at least. In addition, outside of the subdirectories are just routes and server. In server, all instantiations take place here and common objects are shared. Routes will orchestrate the handling of everything. Please note the .env.READMEPLS and ensure your .env files are in .gitignore.

### FRONT
Within the front folder are currently just index.html and style.css. Edit index.html to change the html structure, and style.css for the styling. 


### BACK
The back directory is the most important. It contains the following subdirectories: comm, repos, service, and util.
<br> 
<ul>
  <li>
    comm
    <ul>
      <li>
      This is where connections to the (1)postgre database, (2) the minio bucket, (3) the redis connection and subsequently the queue object, and (4) the websocket are made.
    </li>
    </ul>
  </li> 
  <li>
    repos
    <ul>
      <li>
        This is where postgre operations involving user information and image information are implemented. 
      </li>
    </ul>
  </li>
  <li>
    service
    <ul>
      <li>
        This folder is contains the files that make the API calls to the db (via jobRep and userRep in repos). Minio operations and additions to the queue in redis take place here as well. The bits of code used seemed not significant enough for me to make a file in repos in it. But as of writing, this is probably a better idea, even if just for consistency's sake.
        <li>
          In addition, queueEvent listens in onto the worker process' progress via the queue's status in redis and reacts based on job beginnings, failures, and completion.
        </li>
      </li>
    </ul>
  </li>
  <li>
    util
    <ul>
      <li>
        Where authentication related operations are implemented. JSON webtokens are used for session id creation and verification. Password hashing is done in passHash, but the actual decoding is done in verifyToken in jwtVerify.js. 
      </li>
    </ul>
  </li>
  <li>
    worker
    <ul>
      <li>
        This is folder is where the worker process is instantiated and listens to redis, waiting for a job to arrive to the queue. From then, it will used the selected processing method speicfied by the user and process the image. Upon completion it notifies redis and consequentially queueEvent. Should you add more processing methods, please add it to the processMethodFactory.
      </li>
    </ul>
  </li>
</ul>
<br>
