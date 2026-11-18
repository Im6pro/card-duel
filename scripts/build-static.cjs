const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),output=path.join(root,'public');
fs.mkdirSync(output,{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'web/loading.css'),'utf8');
const script=fs.readFileSync(path.join(root,'web/loading.js'),'utf8');
const markup=fs.readFileSync(path.join(root,'web/loading.html'),'utf8');
html=html.replace('</head>','<style>'+css+'</style><script>'+script+'</script></head>')
  .replace('<body>','<body class="boot-loading">'+markup);
fs.writeFileSync(path.join(output,'index.html'),html);
for(const asset of ['app-icon-180.png','app-icon-192.png','app-icon-512.png','manifest.webmanifest','king-slayer-characters.webp','1026AC6E-94FA-46C3-9487-901BDE9A1770.png'])
  fs.copyFileSync(path.join(root,asset),path.join(output,asset));
console.log('Built static King Slayer frontend');
