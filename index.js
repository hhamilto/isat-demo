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
var updateTermSize = function(){
	getTermSize(function(cb_cols,cb_lines){
		cols = cb_cols
		lines = cb_lines+1
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

paints = ['#','$','=','-',' ']

var charWidthScreenPixels = 9
var charHeightScreenPixels = 18
io.on('connection', function (socket) {
	socket.on('name', function (data) {

	})
	socket.on('photo', function (data) {
		var decoded = dataUriToBuffer(data)
		image(decoded, function(error, info) {
			var height = info.height
			var width = info.width
			var data = info.data

			var imagePixelsPerLine = Math.floor(height/lines)
			var imagePixelsPerColumn = Math.floor(imagePixelsPerLine/2)
			var imageColumns = Math.floor(width/imagePixelsPerColumn)

			if(imageColumns > cols)
				throw Error("fuck")

			var getPixelValue = function(x,y) {
				var baseOffSet = (y*width+x)*4
				ans = [data[baseOffSet],data[baseOffSet+1],data[baseOffSet+2]]
				return ans
			}


			var pixelOffsetsPerChar = _.flatten(_.map(_.times(imagePixelsPerColumn), function(x){
				return _.map(_.times(imagePixelsPerLine), function(y){
					return [x,y]
				})
			}))

			var strToWrite = ''
			var charray = _.each(_.times(lines), function(line){
				_.each(_.times(Math.floor(width/imagePixelsPerColumn)), function(col){
					var topLeftPixel = [col*imagePixelsPerColumn,line*imagePixelsPerLine]
					if(topLeftPixel[1] > 240)
						throw "YOASD"
					total = _.reduce(_.map(pixelOffsetsPerChar, function(coords){
						pixelValue = getPixelValue(topLeftPixel[0]+coords[0],topLeftPixel[1]+coords[1])
						return pixelValue
					}), function(prev, cur){
						prev[0] += cur[0]
						prev[1] += cur[1]
						prev[2] += cur[2]
						return prev
					})
					total[0] = total[0]/(charWidthScreenPixels*charHeightScreenPixels)/255
					total[1] = total[1]/(charWidthScreenPixels*charHeightScreenPixels)/255
					total[2] = total[2]/(charWidthScreenPixels*charHeightScreenPixels)/255

					var value = _.sum(total)/3
					if(total[0] > (total[1]+total[2])/1.26) //red
						strToWrite += "\x1b[31m"
					else if(total[1] > (total[0]+total[2])/1.3) //green
						strToWrite += "\x1b[32m"
					else if(total[2] > (total[0]+total[1])/1.8) //blue
						strToWrite += "\x1b[34m"
					else
						strToWrite += "\x1b[0m"

					if(value>.3){
						strToWrite += paints[0]
					}else if(value>.2){
						strToWrite += paints[1]
					}else if(value>.10){
						strToWrite += paints[2]
					}else if(value>.04){
						strToWrite += paints[3]
					}else{
						strToWrite += paints[4]
					}
				})
				strToWrite += "\n"
			})

			process.stdout.write(strToWrite.substr(0,strToWrite.length-1))
		})
	})
})