Cleanup Old Node.js Projects
============================

```
npm install && npm run start /some/project/path[optional]
```

What?
-----
Pass in a directory path of your projects (or it'll prompt you), and then it'll find which ones haven't 
been touched in a year or more and have a `node_modules` directory. It will then show you which ones and 
prompt you to confirm their removal. Using the [trash](https://www.npmjs.com/package/trash) package, it'll 
safely put the old `node_modules` into your trash, where you can empty or restore them.