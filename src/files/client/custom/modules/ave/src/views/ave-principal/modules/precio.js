define('ave:views/ave-principal/modules/precio', [], function () {

    var PrecioManager = function (view) {
        this.view    = view;
        this.timeout = null;
    };

    PrecioManager.prototype.poblar = function (ave) {
        console.log('=== PRECIO MANAGER: poblar ===');
        console.log('Datos recibidos del AVE:', ave);
        
        this.view.$el.find('#valorMax').val(ave.valorMax || '');
        this.view.$el.find('#precioMax').val(ave.precioMax || '');
        this.view.$el.find('#valorPromedio').val(ave.valorPromedio || '');
        this.view.$el.find('#valorMin').val(ave.valorMin || '');
        this.view.$el.find('#precioMin').val(ave.precioMin || '');
        this.view.$el.find('#precioOriginal').val(ave.precioOriginal || '');

        var pesoOfertas = (ave.pesoOfertas !== undefined && ave.pesoOfertas !== null && ave.pesoOfertas !== '')
            ? parseFloat(ave.pesoOfertas) : 50;

        console.log('Peso Ofertas:', pesoOfertas);
        console.log('Ajuste Precio:', ave.ajustePrecio || 0);

        this.view.$el.find('#pesoOfertas').val(pesoOfertas);
        this.view.$el.find('#pesoVentas').val(100 - pesoOfertas);
        this.view.$el.find('#ajustePrecio').val(ave.ajustePrecio || 0);

        this.initEventos();
        this.actualizarRango(ave.ajustePrecio || 0, ave.precioSugerido || 0);
    };

    PrecioManager.prototype.initEventos = function () {
        var self = this;

        this.view.$el.find('#pesoOfertas').off('input.precio').on('input.precio', function () {
            var val = parseInt($(this).val()) || 0;
            val = Math.min(100, Math.max(0, val));
            $(this).val(val);
            self.view.$el.find('#pesoVentas').val(100 - val);
            console.log('Peso Ofertas cambiado a:', val);
            self.calcular();
        });

        this.view.$el.find('#ajustePrecio').off('input.precio').on('input.precio', function () {
            var val = parseInt($(this).val()) || 0;
            val = Math.min(100, Math.max(-100, val));
            $(this).val(val);
            console.log('Ajuste Precio cambiado a:', val);
            self.calcular();
        });
    };

    PrecioManager.prototype.calcular = function () {
        var self = this;

        if (this.timeout) clearTimeout(this.timeout);

        this.timeout = setTimeout(function () {
            var aveId       = self.view.aveId;
            var pesoOfertas = parseFloat(self.view.$el.find('#pesoOfertas').val()) || 50;
            var ajuste      = parseFloat(self.view.$el.find('#ajustePrecio').val()) || 0;

            console.log('=== PRECIO MANAGER: calcular ===');
            console.log('aveId:', aveId);
            console.log('pesoOfertas enviado:', pesoOfertas);
            console.log('ajuste enviado:', ajuste);

            Espo.Ajax.postRequest('AvePrincipal/action/recalcularPrecios', {
                aveId:       aveId,
                pesoOfertas: pesoOfertas,
                ajustePrecio: ajuste
            })
            .then(function (response) {
                console.log('Respuesta del servidor (recalcularPrecios):', response);
                if (response.success) {
                    var d = response.data;
                    console.log('Datos recibidos del servidor:', d);
                    
                    self.view.$el.find('#valorMax').val(d.valorMax);
                    self.view.$el.find('#precioMax').val(d.precioMax);
                    self.view.$el.find('#valorPromedio').val(d.valorPromedio);
                    self.view.$el.find('#valorMin').val(d.valorMin);
                    self.view.$el.find('#precioMin').val(d.precioMin);
                    self.view.$el.find('#precioOriginal').val(d.precioOriginal);
                    
                    self.view.$el.find('#pesoVentas').val(100 - (d.pesoOfertas || pesoOfertas));
                    self.actualizarRango(d.ajustePrecio, d.precioSugerido);
                } else {
                    console.error('Error en recalcularPrecios:', response.error);
                    Espo.Ui.error(response.error || 'Error al recalcular precios');
                }
            })
            .catch(function (error) {
                console.error('Error en petición recalcularPrecios:', error);
                Espo.Ui.error('Error al conectar con el servidor');
            });
        }, 400);
    };

    PrecioManager.prototype.actualizarRango = function (ajuste, precioSugerido) {
        ajuste        = parseFloat(ajuste)        || 0;
        precioSugerido = parseFloat(precioSugerido) || 0;

        console.log('actualizarRango - ajuste:', ajuste, 'precioSugerido:', precioSugerido);

        if (precioSugerido > 0) {
            var min = Math.round(precioSugerido * (1 - ajuste / 100));
            var max = Math.round(precioSugerido * (1 + ajuste / 100));

            var fmt = function (n) {
                return n.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            };

            console.log('Rango calculado - min:', min, 'max:', max);
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ ' + fmt(min));
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ ' + fmt(max));
        } else {
            console.warn('precioSugerido es 0 o inválido');
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ 0.00');
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ 0.00');
        }
    };

    return PrecioManager;
});