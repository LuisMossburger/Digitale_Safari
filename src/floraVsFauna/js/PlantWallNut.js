PlantWallNut = function() {
	Plant.apply(this,arguments);
	this.color = 'brown';
	this.image = $('img-nut');
	this.price = 50;
	this.health = 500;
}
extend(PlantWallNut,Plant);

PlantWallNut.prototype.update = function() {
	var t = new Date().getTime();
	this.checkDamage(t);
}

PlantWallNut.prototype.draw = function() {
	cxt.drawImage( this.image, this.x - this.w , this.y -60, 80,80);

	//Display health
	cxt.font = '16px Arial';
	cxt.fillStyle = '#0d0';
	cxt.fillRect(this.x - 15, this.y - 37, 35, 20);

	cxt.fillStyle = '#fff';
	cxt.fillText(this.health,this.x - 10,this.y - 20);
}
