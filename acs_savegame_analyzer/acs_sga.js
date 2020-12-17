// acs_sga.js
// 2020 by Gaddhi, This work is licensed under Creative Commons BY-NC-SA 4.0 license
// Feedback is welcome on https://github.com/CultiGaddhi/CultiGaddhi.github.io/issues or via ACS Discord user Gaddhi#8937 (https://discord.gg/MwmYaXjx)

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
  {'id': 'BOXES', 'dis': 'Boxes'},
  {'id': 'WATER', 'dis': 'Water'},
  {'id': 'MONSTER', 'dis': 'Monster'},
  {'id': 'MAP', 'dis': 'Map'},
];
display_table_row(display_def.map((r) => { return r.dis }));

drop.addEventListener('dragover', function(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

var inqueue = 0;

drop.addEventListener('drop', function(e) {
  e.stopPropagation();
  e.preventDefault();
  var files = e.dataTransfer.files; // Array of all files

  for (var i=0, file; file=files[i]; i++) {
    if (inqueue++ == 0) {
      document.body.style.cursor = "progress";
    }

    var reader = new FileReader();
    reader.onload = (function(file_inner) {
      return function(e2) {
        handle_savegame(e2.target.result, file_inner);
        if (--inqueue == 0) {
          document.body.style.cursor = '';
        }
      };
    })(file.name);

    reader.readAsText(file); // start reading the file data.
  }

});

function handle_savegame(text, filename) {
  var res = {};
  var monster = undefined;

  if (!filename.match(/[.]save$/)) {
    display_table_row([filename, 'Unrecognized Filetype. Please only upload .save files.']);
    return;
  }
  filename = filename.slice(0,-5)

  // parse data as JSON
  var index = text.indexOf('{');
  text = text.slice(index);
  var data;
  try {
    data = JSON.parse(text); 
  } catch (e) {
    display_table_row([filename, 'Save File can not be processed. Please enable "Fast Saving" in Game Menu and save again.']);
    return;
  }

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
    if ('RaceDefName|F' in thing) {
      var monstername = thing['RaceDefName|F'];
      if(monstername.substring(0,2) == 'JY') {
        monster = monstername.substring(2);
      }
    }
  });
  Object.keys(res2).forEach((k) => {
    res[k] = res2[k];
  });
  res['BOXES'] = 0;
  res['WATER'] = 0;
  ['Box_Cargo', 'Box_Corpse'].forEach((n) => {
    if (n in res) { res['BOXES'] += res[n]; }
  });
  ['DepthWater', 'DepthDepthWater', 'ShallowWater'].forEach((n) => {
    if (n in res) { res['WATER'] += res[n]; }
  });
  res['WATER'] = (res['WATER'] / (res.size * res.size) * 100).toFixed(1) + "%";
  res['MAP'] = data;
  res['MONSTER'] = monster;
  var rowelements = display_def.map((def) => {
   return res[def.id];
  });

  display_table_row(rowelements);
//  console.log(res);
}

function display_table_row(re) {
  var table = document.getElementById('ta');
  var row = table.insertRow(-1);
  if (re[0] == 'Savegame') {
    row.classList.add('header');
  } else if (re[3] > 1200 && re[4] > 200 && re[5] > 200) {
    row.classList.add('top');
  } else if (re[3] > 1200 || re[4]+re[5] > 700) {
    if (re[3] > 1800 || re[4]+re[5] > 900) {
      row.classList.add('veryremarkable');
    } else {
      row.classList.add('remarkable');
    }
  } else {
    row.classList.add('normal');
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
      canvas.addEventListener("click", save_map);
      canvas.classList.add('hoverpic');
      c.classList.add('maptd');
    }
  })
}

function draw_map(canvas, data) {
  var size = data.World.world.map['Size|P'];
  canvas.width  = size;
  canvas.height = size;
  canvas.style.border = "0px";

  // Draw Terrain
  var terrainbase = data.World.world.map['Terrain|F']._hd;
  var colortrans = {
    'Soil': '#715C37',
    'Sand': '#715C37',
    'Mud': '#61522C',
    'Void': '#000000',
    'WetLand': '#6B4B20',
    'FertileSoil': '#989039',
    'StoneLand': '#AC9254',
    'SandLand': '#BA8E1B',
    'LingSoil': '#006550',
    'DepthDepthWater': '#4F798C',
    'DepthWater': '#4F798C',
    'ShallowWater': '#5C8690',
    'BloodWater': '#AA0000',
    'DepthBloodWater': '#800000',
    'LingWater': '#2EE2E8',
  };
  var ctx = canvas.getContext('2d');
  var img = ctx.createImageData(size, size);
  ['Top', 'Under'].forEach ((layer) => {
    var terrain = terrainbase[layer];
    var terrainnames = Object.keys(terrain);
    terrainnames.forEach((terrainname) => {
      var color = colortrans[terrainname];
      if (typeof color == 'string') {
        console.log(terrainname);
        var color2 = color_to_values(color);
        terrain[terrainname].forEach((coord) => {
          put_color(img.data, coord, color2, size);
        })
      } else if (terrainname.substring(0, 5) == 'Floor') {
        // ignore them
      } else {
        window.alert('Please notify the developer: unknown terrain ' + terrainname);
        var color2 = color_to_values('#ff0000');
        terrain[terrainname].forEach((coord) => {
          put_color(img.data, coord, color2, size);
        })
      }
    });
  });

  // Draw Mountains over Terrain
  var default_mountain_color = '#443d2f'
  var mountains = {
    'CopperOre': color_to_values('#be5888'),
    'Darksteel': color_to_values(default_mountain_color),
    'IronOre': color_to_values(default_mountain_color),
    'RockBrown': color_to_values(default_mountain_color),
    'RockCinnabar': color_to_values(default_mountain_color),
    'RockGray': color_to_values(default_mountain_color),
    'RockJade': color_to_values(default_mountain_color),
    'RockMarble': color_to_values(default_mountain_color),
    'SilverOre': color_to_values('#7a71cf'),
  };
  var things = data.World.thing.Things;
  things.forEach((thing) => {
    var name = thing['def|P'].N;
    if (name in mountains) {
      put_color(img.data, thing['_hd']['Ns'][2], mountains[name], size);
    }
  });
  var things = data.World.thing.SmallPlants;
  keys = Object.keys(things);
  keys.forEach((key) => {
    if (key in mountains) {
      things[key].forEach((coord) => {
        put_color(img.data, coord, mountains[key], size);
      });
    }
  });


  ctx.putImageData(img, 0, 0);

  // Draw Startposition
  born = data.World.world.map['BornCenter|F'];
  var bx = born % size;
  var by = 191-Math.floor(born / size);
  ctx.strokeStyle = '#ffffff40';
  ctx.strokeRect(bx-5+0.5, by-5+0.5, 10, 10);

  // Draw Ginkgo and Monster over Terrain and Mountains
  var g = data.World.thing.SmallPlants['TreeGinkgo_Big'];
  var monsterpos = undefined;
  if (typeof g == 'undefined') {
    g = [];
  }
  var things = data.World.thing.Things;
  things.forEach((thing) => {
    var n = thing['def|P'].N;
    if (n == 'TreeGinkgo_Big') {
      g.push(thing['_hd']['Ns'][2]);
    } else if ('RaceDefName|F' in thing) {
      var monstername = thing['RaceDefName|F'];
      if(monstername.substring(0,2) == 'JY') {
        monsterpos = thing['_hd']['Ns'][2];
      }
    }
  });

  ctx.strokeStyle = '#ffffff';
  g.forEach((coord) => {
    var x = coord % size;
    var y = 191-Math.floor(coord / size);
    ctx.beginPath();
    ctx.ellipse(x+0.55, y+0.45, 2, 2, 0, 0, 2 * Math.PI);
    ctx.stroke();
  });
  if (typeof(monsterpos) == 'number') {
    ctx.strokeStyle = '#00ff00';
    var x = monsterpos % size;
    var y = 191-Math.floor(monsterpos / size);
    ctx.beginPath();
    ctx.ellipse(x+0.55, y+0.45, 2, 2, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function put_color(data, coord, color, size) {
  var x = coord % size;
  var y = 191-Math.floor(coord / size);
  var index = (size * y + x) * 4;
  data[index] = color[0];
  data[index+1] = color[1];
  data[index+2] = color[2];
  data[index+3] = 255;
}

function save_map(seed) {

  var pic = this.toDataURL();

  var tmpLink = document.createElement( 'a' );  
  var seed = this.parentElement.parentElement.children[1].innerHTML;
  tmpLink.download = seed + '.png'; 
  tmpLink.href = pic;
  
  document.body.appendChild( tmpLink );  
  tmpLink.click();  
  document.body.removeChild( tmpLink );
}

function color_to_values(color) {
  return [
    parseInt(color.substr(1, 2), 16),
    parseInt(color.substr(3, 2), 16),
    parseInt(color.substr(5, 2), 16)
  ];
}

function toggle_hide() {
  document.getElementById('ta').classList.toggle('hidenormal');
}