var WebSocketServer = require('websocket').server
var http = require('http')
var _ = require('lodash')

var express = require('express')
var app = express()
var fs = require('fs')
var isat = require('isat')

var spawn = require('child_process').spawn
function getTermSize(cb){
    spawn('resize').stdout.on('data', function(data){
        data = String(data)
        var lines = data.split('\n'),
            cols = Number(lines[0].match(/^COLUMNS=([0-9]+);$/)[1]),
            lines = Number(lines[1].match(/^LINES=([0-9]+);$/)[1])
        if (cb)
            cb(cols, lines)
    })
}//credit: http://tobyho.com/2011/10/15/getting-terminal-size-in-node/
var cols,lines
;updateTermSize = function(){
	getTermSize(function(cb_cols,cb_lines){
		cols = cb_cols
		lines = cb_lines
	})
}
updateTermSize()
setInterval(updateTermSize, 5000)

app.use(isat)
app.use(express.static(__dirname + '/public'))


var server = http.createServer(app).listen(3000, function(){
	console.log("listenin on 3000")
})


var io = require('socket.io')(server)
var dataUriToBuffer = require('data-uri-to-buffer')
var image = require('get-image-data')

//cusor size: 9x18

paints = ['#','$','-',' ']

var charWidthScreenPixels = 9
var charHeightScreenPixels = 18
io.on('connection', function (socket) {
	socket.on('photo', function (data) {
		var decoded = dataUriToBuffer(data)
		image(decoded, function(error, info) {
			var height = info.height
			var width = info.width
			var data = info.data

			var imagePixelsPerLine = Math.floor(height/lines)
			var imagePixelsPerColumn = Math.floor(imagePixelsPerLine/2)
			var imageColumns = Math.floor(width/imagePixelsPerColumn)
			console.log(imagePixelsPerLine, imagePixelsPerColumn, imageColumns)

			if(imageColumns > cols)
				throw Error("fuck")

			var getPixelValue = function(x,y) {
				var baseOffSet = (y*width+x)*4
				ans = (data[baseOffSet]+data[baseOffSet+1]+data[baseOffSet+2])/3
				if(isNaN(ans)){
					console.log(x,y)
					process.exit(1)
				}
				return ans
			}
			var pixelOffsetsPerChar = _.flatten(_.map(_.times(charHeightScreenPixels), function(y){
				return _.map(_.times(charWidthScreenPixels), function(x){
					return [x,y]
				})
			}))
			var charray = _.map(_.times(lines), function(line){
				return _.map(_.times(cols), function(col){
					var topLeftPixel = [col*imagePixelsPerColumn,line*imagePixelsPerLine]
					if(topLeftPixel[1] > 240)
						throw "YOASD"
					//console.log(topLeftPixel)
					total = _.add(_.map(pixelOffsetsPerChar, function(coords){
						console.log("about to get value")
						console.log(topLeftPixel[1])
						pixelValue = getPixelValue(topLeftPixel[0]+coords[0],topLeftPixel[1]+coords[1])
						return pixelValue
					}))
					total = total/(charWidthScreenPixels*charHeightScreenPixels)/255
					return total;
				})
			})
			//console.log(charray[0])
			//console.log(width,height)

			/*for (var i = 0, l = data.length; i < l; i += 4) {

				var i = 10*4
				var red = data[i]
				var green = data[i + 1]
				var blue = data[i + 2]
				var alpha = data[i + 3]
				console.log(red,green,blue,alpha)	
			}*/
		})
		fs.writeFileSync('fuck.png', decoded)
	});
});