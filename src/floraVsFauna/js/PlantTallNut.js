PlantTallNut = function() {
	Plant.apply(this,arguments);
	this.color = '#333';
	this.image = $('img-nutTall');
	this.price = 150;
	this.h = 75;
	this.health = 900;
}
extend(PlantTallNut,Plant);

PlantTallNut.prototype.update = function() {
	var t = new Date().getTime();
	this.checkDamage(t);
}

PlantTallNut.prototype.draw = function() {
	cxt.drawImage( this.image, this.x - this.w , this.y -60, 80,80);

	//Display health
	cxt.font = '16px Arial';
	cxt.fillStyle = '#0d0';
	cxt.fillRect(this.x - 15, this.y - 37, 35, 20);

	cxt.fillStyle = '#fff';
	cxt.fillText(this.health,this.x - 10,this.y - 20);
}
