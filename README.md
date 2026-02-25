# Values-Simplifier
Hello. This program is a tool I've made to help me understand and keep track of values across an image when doing still-lifes. 
Example:

<img width ="500" height="800" src="https://github.com/user-attachments/assets/d228473f-2206-49c8-8f47-e5154219ba79" />
<img width="500" height="800" alt="1-816ccccf5aad5b993269d39f3ed3bb23-2577790819" src="https://github.com/user-attachments/assets/2378ad38-a951-42cb-b16d-3380c2fb2777" />
<br>
It's not perfect, and there are improvements to made to the image processing, but should you want to give feedback or want to change the algo, please feel free to do so.
The following is a general flow of how the program works, but note that this was before i threw the server and python worker into containers as well.
<img width="1100" height="1400" src="https://github.com/user-attachments/assets/17fad36f-30f4-47e8-8ffe-a709d605669d" />


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
```docker compose up -d```

# INSTALLATION Method 2

Or... you can download the docker image <a href="https://drive.google.com/file/d/19BmtIQeiJFAjyOCIoyFz2wZGyfZfEfSV/view?usp=sharing">here</a> and run: <br>
```docker load -i values-simplifier-images.tar```
