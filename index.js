// output a typescript file using the Slice.json file
const fs = require('fs');
const path = require('path');

// loop throguh the slice and create a typescript file

// read all json files in the folder toTS
fs.readdir(path.join(__dirname, "toTS"), (err, files) => {
    files.forEach(file => {
        if (!file.endsWith(".json")) return;
        let json = require(path.join(__dirname, "toTS", file));
        convert(file.split('.')[0], json);
    });
});

// keep a list of serialized functions
function convert(name, json) {
    const functions = [];

    // json replacer - returns a placeholder for functions
    const jsonReplacer = function (key, val) {
        if (typeof val === 'function') {
            functions.push(val.toString());
            
            return "{func_" + (functions.length - 1) + "}";
        }
            
        return val;
    };

    // regex replacer - replaces placeholders with functions
    const funcReplacer = function (match, id) {
    return functions[id];
    };

    const Packages = {};
    let NonStaticClasses = [];

    for (const [key, value] of Object.entries(json)) {
        let splitClassName = key.split('.');
        // loop through the splitClassName and create the packages
        if (!value.modifiers.includes("static")) {
            NonStaticClasses.push('"' + key + '"')
        }

        let currentClassName = "";

        for (let i = 0; i < splitClassName.length; i++) {
            if (i == 0) {
                currentClassName = splitClassName[i];
            }
            else {
                currentClassName += '.' + splitClassName[i];
            }
            eval(`if (Packages.${currentClassName} == undefined) Packages.${currentClassName} = {};`);
            console.log(currentClassName)
        }
    }

    for (const [key, value] of Object.entries(json)) {
        // add the package to the packages object example: Packages.net.minecraft.block.Block = { ... }

        for (const [outputType, outputObject] of Object.entries(value)) {
            switch (outputType) {
                case 'methods':
                    for (const [methodName, methodObject] of Object.entries(outputObject)) {
                        if (methodObject.modifiers.includes('static')) {
                            // write a placeholder function at Packages.${key}.${methodName}
                            eval(`Packages.${key}.${methodName} = function() {};`);
                        } else {
                            NonStaticClasses.push('"' + key + "." + methodName + '"');
                        }
                    }
                    break;
                case 'fields':
                    for (const [fieldName, fieldObject] of Object.entries(outputObject)) {
                        eval(`Packages.${key}.${fieldName} = {};`);
                    }
                    break;
            }
                
        }
    }

    // make Packages a string without removing the functions
    let PackagesString = "export const Packages = " + JSON.stringify(Packages, jsonReplacer, 4).replace(/"\{func_(\d+)\}"/g, funcReplacer) + ";\n";
    NonStaticClasses = NonStaticClasses.join(' | \n                        ');
    const javaType = 
    "export const Java = {\n" +
    `    type: (className: (${NonStaticClasses}\n        )\n    ) => {}\n` +
    "};"
    PackagesString += javaType;
                    

    fs.writeFileSync(path.join(__dirname, "toTS", name + ".ts"), PackagesString);
}