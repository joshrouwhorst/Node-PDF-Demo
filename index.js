var fs = require('fs');
var q = require('q');
var pdfkit = require('pdfkit');
var imageSize = require('image-size');

var opts = {};

// Set options provided by user
setOptions();

// Collect file names from directory
getImageFiles().then(function (images) {

    // Collect image data
    getImageData(images).then(function (images) {

        // Create the PDF document
        makePdf(images).then(function () {
            // Finished
            console.log('Done!');
            process.exit(0);
        }, fatalError);
    }, fatalError);
}, fatalError);

function fatalError(err) {
    console.error(err);
    process.exit(0);
}

function setOptions() {
    var args = process.argv;

    for (var i = 0; i < args.length; i++) {
        switch(args[i]) {
            case '-in':
                opts.incomingDir = args[++i];
                break;
            case '-out':
                opts.outgoingFile = args[++i];
                break;
            default:
                break;
        }
    }
}

function getImageFiles() {
    var def = q.defer();
    var imageCount = 0, imagesComplete = 0;

    fs.readdir(opts.incomingDir, function (err, items) {
        if (err) {
            return def.reject(err);
        }

        var images = [];

        for (var i = 0; i < items.length; i++) {
            if (items[i] === '.DS_Store') {
                continue;
            }

            images.push({
                filename: opts.incomingDir + '/' + items[i]
            });
        }

        if (images.length === 0) {
            console.log('No images found.');
            process.exit(0);
        }

        console.log(images.length + ' images found.');

        def.resolve(images);
    });

    return def.promise;
}

function getImageData(images) {
    var def = q.defer();
    var imageCount = images.length, imagesComplete = 0;

    for (var i = 0; i < images.length; i++) {
        imageData(images[i]).then(complete, failed);
    }

    function complete() {
        imagesComplete++;

        if (imagesComplete === imageCount) {
            def.resolve(images);
        }
    }

    function failed(err) {
        console.error(err);
        complete();
    }

    return def.promise;
}

function imageData(image) {
    var def = q.defer();

    fs.readFile(image.filename, function(err, data) {
        if (err) {
            return def.reject(err);
        }

        image.buffer = data;
        image.size = imageSize(image.filename);

        def.resolve(image);
    });

    return def.promise;
}

function makePdf(images) {
    var def = q.defer();

    try {
        var doc = new pdfkit({autoFirstPage: false});

        for (var i = 0; i < images.length; i++) {
            if (!images[i].buffer) {
                continue;
            }

            imagePage(doc, images[i]);
            //imageWithMargin(doc, images[i]);
            //imageWithText(doc, images[i]);
        }

        var stream = fs.createWriteStream(opts.outgoingFile);
        doc.pipe(stream);
        doc.end();

        stream.addListener('finish', function () {
            def.resolve();
        });
    }
    catch (err) {
        def.reject(err);
    }

    return def.promise;
}

function imagePage(doc, image) {
    doc.addPage({
        margin: 0,
        size: [image.size.width, image.size.height]
    });

    doc.image(image.buffer, 0, 0);
}

function imageWithMargin(doc, image) {
    var margin = 50;

    doc.addPage({ margin: margin });

    doc.image(image.buffer, margin, margin, {
        fit: [
            doc.page.width - (margin * 2),
            doc.page.height - (margin * 2)
        ]
    });
}

function imageWithText(doc, image) {
    var margin = 50;
    var fontSize = 15;

    var texts = ['Awwwwwwww', 'OMG!', 'Soooooo cute!'];
    var rand = Math.floor(Math.random() * texts.length);
    var text = texts[rand];

    doc.addPage({ margin: margin });

    doc.fontSize(fontSize);

    doc.text(text, margin, margin);

    doc.image(image.buffer, margin, margin + fontSize, {
        fit: [
            doc.page.width - (margin * 2),
            doc.page.height - (margin * 2)
        ]
    });
}
