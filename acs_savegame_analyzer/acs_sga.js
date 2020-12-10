var drop = document.getElementById('drop');
var display_def = [
  {'id': 'file', 'dis': 'Savegame'},
  {'id': 'seed', 'dis': 'Seed'},
  {'id': 'size', 'dis': 'Size'},
  {'id': 'LingSoil', 'dis': 'Spirit Soil'},
  {'id': 'SilverOre', 'dis': 'Ice Crystal'},
  {'id': 'CopperOre', 'dis': 'Igneocopper'},
//  {'id': 'RockCinnabar', 'dis': 'Cinnabar'},
//  {'id': 'Darksteel', 'dis': 'Darksteel'},
//  {'id': 'RockJade', 'dis': 'Jade'},
  {'id': 'TreeGinkgo_Big', 'dis': 'Huge Ginkgo'},
//  {'id': 'FertileSoil', 'dis': 'Fertile Soil'},
  {'id': 'MAP', 'dis': 'Map'},
];
display_table_row(display_def.map((r) => { return r.dis }));

drop.addEventListener('dragover', function(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

drop.addEventListener('drop', function(e) {
  e.stopPropagation();
  e.preventDefault();
  var files = e.dataTransfer.files; // Array of all files

  for (var i=0, file; file=files[i]; i++) {
    if (file.name.match(/.save$/)) {
      var reader = new FileReader();

      reader.onload = (function(file_inner) {
        return function(e2) {
          handle_savegame(e2.target.result, file_inner);
        };
      })(file.name.slice(0,-5));
      
      reader.readAsText(file); // start reading the file data.
    } else {
      console.log("Filetype not recognized. Must be a \".save\": " + file.name);
    }
  }
});

function handle_savegame(text, filename) {
  var res = {};

  // parse data as JSON
  var index = text.indexOf('{');
  text = text.slice(index);
  var data = JSON.parse(text); 

  // extract globals
  res.seed = data.World.world.map['Seed|F'];
  res.size = data.World.world.map['Size|P'];
  res.file = filename;

  // extract terrain
  var terrain = data.World.world.map['Terrain|F']._hd.Top;
  var terrainnames = Object.keys(terrain);
  terrainnames.forEach((terrainname) => {
    res[terrainname] = terrain[terrainname].length;
  });

  // extract things part 1
  var res2 = {};
  var things = data.World.thing.SmallPlants;
  keys = Object.keys(things);
  keys.forEach((key) => {
    res2[key] = things[key].length;
  });

  // extract things part 2
  var things = data.World.thing.Things;
  things.forEach((thing) => {
    var n = thing['def|P'].N;
    if (! (n in res2)) {
      res2[n] = 0;
    }
    res2[n]++;
  });
  Object.keys(res2).forEach((k) => {
    res[k] = res2[k];
  });
  res['MAP'] = data;
  var rowelements = display_def.map((dis) => {
    return res[dis.id];
  });

  console.log(rowelements);
  display_table_row(rowelements);
  console.log("Savegame: ");
  console.log(res);
}

function display_table_row(re) {
  var table = document.getElementById('ta');
  var row = table.insertRow(-1);
  if (re[3] > 1300 && re[4]+re[5] > 400 && re[4] > 200) {
    row.classList.add('top');
  } else {
    if (re[3] > 1300 || re[4]+re[5] > 600) {
      if (re[3] > 1600 || re[4]+re[5] > 700) {
        row.classList.add('veryremarkable');
      } else {
        row.classList.add('remarkable');
      }
    }
  }
  re.forEach((element) => {
    var c = row.insertCell(-1);
    if (typeof element == 'undefined') {
      c.innerHTML = '0';
    } else if (typeof element == 'string' || typeof element == 'number') {
      c.innerHTML = element;
    } else {
      var canvas = document.createElement('canvas');
      draw_map(canvas, element);
      c.appendChild(canvas);
    }
  })
}

function draw_map(canvas, data)
{
  var size = data.World.world.map['Size|P'];
  canvas.width  = size;
  canvas.height = size;
  canvas.style.border = "1px solid";

  // handle drawing of terrain
  var terrain = data.World.world.map['Terrain|F']._hd.Top;
  var colortrans = {
    'Soil': '#78684e',
    'LingSoil': '#2e6455',
    'Mud': '#675c41',
    'ShallowWater': '#869fa4',
    'DepthWater': '#627b85',
    'DepthDepthWater': '#617a84',
    'StoneLand': '#806e43',
    'FertileSoil': '#958d54',
    'WetLand': '#786143',
  };
  var ctx = canvas.getContext('2d');
  var img = ctx.createImageData(size, size);
  var terrainnames = Object.keys(terrain);
  terrainnames.forEach((terrainname) => {
    var color = colortrans[terrainname];
    if (typeof color == 'string') {
      var color2 = [
        parseInt(color.substr(1, 2), 16),
        parseInt(color.substr(3, 2), 16),
        parseInt(color.substr(5, 2), 16)
      ];
      terrain[terrainname].forEach((coord) => {
        put_color(img.data, coord, color2, size);
      })
    } else {
      window.alert('Please notify the developer: unknown terrain ' + terrainname);
    }
  });

  // handle drawing of mountains
  var color = '#443d2f';
  var color2 = [
    parseInt(color.substr(1, 2), 16),
    parseInt(color.substr(3, 2), 16),
    parseInt(color.substr(5, 2), 16)
  ];
  var mountains = {
    'CopperOre': 1,
    'Darksteel': 1,
    'IronOre': 1,
    'RockBrown': 1,
    'RockCinnabar': 1,
    'RockGray': 1,
    'RockJade': 1,
    'RockMarble': 1,
    'SilverOre': 1,
  };
  var things = data.World.thing.Things;
  things.forEach((thing) => {
    if (thing['def|P'].N in mountains) {
      put_color(img.data, thing['_hd']['Ns'][2], color2, size);
    }
  });
  var things = data.World.thing.SmallPlants;
  keys = Object.keys(things);
  keys.forEach((key) => {
    if (key in mountains) {
      things[key].forEach((coord) => {
        put_color(img.data, coord, color2, size);
      });
    }
  });

  
  // put map on screen
  ctx.putImageData(img, 0, 0);

  // Draw Ginkgo over landscape
  var g = data.World.thing.SmallPlants['TreeGinkgo_Big'];
  if (typeof g == 'undefined') {
    g = [];
  }
  var things = data.World.thing.Things;
  things.forEach((thing) => {
    var n = thing['def|P'].N;
    if (n == 'TreeGinkgo_Big') {
      g.push(thing['_hd']['Ns'][2]);
    }
  });

  console.log (g);
  ctx.strokeStyle = '#ffffff';
  g.forEach((coord) => {
    var x = coord % size;
    var y = 191-Math.floor(coord / size);
    ctx.beginPath();
    ctx.ellipse(x, y, 2, 2, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
  });
}

function put_color(data, coord, color, size)
{
  var x = coord % size;
  var y = 191-Math.floor(coord / size);
  var index = (size * y + x) * 4;
  data[index] = color[0];
  data[index+1] = color[1];
  data[index+2] = color[2];
  data[index+3] = 255;
}