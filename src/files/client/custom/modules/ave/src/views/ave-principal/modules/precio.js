define('ave:views/ave-principal/modules/precio', [], function () {

    var PrecioManager = function (view) {
        this.view = view;
        this.timeout = null;
        this.initEventos();
    };

    PrecioManager.prototype.initEventos = function () {
        var self = this;
        
        // Cuando cambia peso ofertas
        this.view.$el.find('#pesoOfertas').on('input', function() {
            var val = parseInt($(this).val()) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            $(this).val(val);
            
            // Actualizar peso ventas visualmente
            var pesoVentas = 100 - val;
            self.view.$el.find('#pesoVentas').val(pesoVentas);
            
            console.log('Peso ofertas:', val, '→ Peso ventas:', pesoVentas);
            
            self.calcular();
        });
        
        // Cuando cambia ajuste de precio
        this.view.$el.find('#ajustePrecio').on('input', function() {
            var val = parseInt($(this).val()) || 0;
            if (val < -100) val = -100;
            if (val > 100) val = 100;
            $(this).val(val);
            self.calcular();
        });
        
        // Botón recalcular
        this.view.$el.find('[data-action="recalcular-precios"]').on('click', function() {
            self.calcular();
        });
    };

    PrecioManager.prototype.poblar = function (ave) {
        console.log('Poblando precios:', ave);
        
        this.view.$el.find('#valorMax').val(ave.valorMax || '');
        this.view.$el.find('#precioMax').val(ave.precioMax || '');
        this.view.$el.find('#valorMin').val(ave.valorMin || '');
        this.view.$el.find('#precioMin').val(ave.precioMin || '');
        this.view.$el.find('#valorPromedio').val(ave.valorPromedio || '');
        this.view.$el.find('#precioOriginal').val(ave.precioOriginal || '');
        
        var pesoOfertas = (ave.pesoOfertas !== undefined && ave.pesoOfertas !== null) ? ave.pesoOfertas : 70;
        var pesoVentas = 100 - pesoOfertas;
        
        this.view.$el.find('#pesoOfertas').val(pesoOfertas);
        this.view.$el.find('#pesoVentas').val(pesoVentas);
        this.view.$el.find('#ajustePrecio').val(ave.ajustePrecio || 0);
        
        this.actualizarRango(ave.ajustePrecio || 0, ave.precioSugerido || 0);
    };

    PrecioManager.prototype.calcular = function () {
        var self = this;
        
        if (this.timeout) clearTimeout(this.timeout);
        
        this.timeout = setTimeout(function() {
            var aveId = self.view.aveId;
            var pesoOfertas = parseFloat(self.view.$el.find('#pesoOfertas').val()) || 70;
            var ajuste = parseFloat(self.view.$el.find('#ajustePrecio').val()) || 0;
            
            console.log('Recalculando:', { aveId, pesoOfertas, ajuste });
            
            Espo.Ajax.postRequest('AvePrincipal/action/recalcularPrecios', {
                aveId: aveId,
                pesoOfertas: pesoOfertas,
                ajustePrecio: ajuste
            }).then(function (response) {
                if (response.success) {
                    var data = response.data;
                    self.view.$el.find('#valorMax').val(data.valorMax);
                    self.view.$el.find('#precioMax').val(data.precioMax);
                    self.view.$el.find('#valorMin').val(data.valorMin);
                    self.view.$el.find('#precioMin').val(data.precioMin);
                    self.view.$el.find('#valorPromedio').val(data.valorPromedio);
                    self.view.$el.find('#precioOriginal').val(data.precioOriginal);
                    self.actualizarRango(data.ajustePrecio, data.precioSugerido);
                } else {
                    Espo.Ui.error(response.error || 'Error al recalcular precios');
                }
            }).catch(function (error) {
                console.error('Error en recalcularPrecios:', error);
                Espo.Ui.error('Error al conectar con el servidor');
            });
        }, 300);
    };

    PrecioManager.prototype.actualizarRango = function (ajuste, precioSugerido) {
        if (precioSugerido > 0) {
            var min = precioSugerido * (1 - ajuste / 100);
            var max = precioSugerido * (1 + ajuste / 100);
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ ' + min.toLocaleString('es-VE', { minimumFractionDigits: 2 }));
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ ' + max.toLocaleString('es-VE', { minimumFractionDigits: 2 }));
        } else {
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ 0.00');
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ 0.00');
        }
    };

    return PrecioManager;
});