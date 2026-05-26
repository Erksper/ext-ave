define('ave:views/ave-principal/modules/precio', [], function () {

    var PrecioManager = function (view) {
        this.view    = view;
        this.timeout = null;
        // NO inicializar eventos aquí — el DOM no existe aún
    };

    // Se llama desde poblarFormulario(), cuando el DOM ya está listo
    PrecioManager.prototype.poblar = function (ave) {
        this.view.$el.find('#valorMax').val(ave.valorMax        || '');
        this.view.$el.find('#precioMax').val(ave.precioMax      || '');
        this.view.$el.find('#valorMin').val(ave.valorMin        || '');
        this.view.$el.find('#precioMin').val(ave.precioMin      || '');
        this.view.$el.find('#valorPromedio').val(ave.valorPromedio || '');
        this.view.$el.find('#precioOriginal').val(ave.precioOriginal || '');

        var pesoOfertas = (ave.pesoOfertas !== undefined && ave.pesoOfertas !== null)
            ? ave.pesoOfertas : 70;

        this.view.$el.find('#pesoOfertas').val(pesoOfertas);
        this.view.$el.find('#pesoVentas').val(100 - pesoOfertas);
        this.view.$el.find('#ajustePrecio').val(ave.ajustePrecio || 0);

        // Inicializar eventos aquí, cuando el DOM está poblado
        this.initEventos();

        this.actualizarRango(ave.ajustePrecio || 0, ave.precioSugerido || 0);
    };

    PrecioManager.prototype.initEventos = function () {
        var self = this;

        // Evitar duplicar listeners si poblar() se llama más de una vez
        this.view.$el.find('#pesoOfertas').off('input.precio').on('input.precio', function () {
            var val = parseInt($(this).val()) || 0;
            val = Math.min(100, Math.max(0, val));
            $(this).val(val);
            self.view.$el.find('#pesoVentas').val(100 - val);
            self.calcular();
        });

        // Ajuste de precio — recalcula automáticamente sin botón
        this.view.$el.find('#ajustePrecio').off('input.precio').on('input.precio', function () {
            var val = parseInt($(this).val()) || 0;
            val = Math.min(100, Math.max(-100, val));
            $(this).val(val);
            self.calcular();
        });
    };

    PrecioManager.prototype.calcular = function () {
        var self = this;

        if (this.timeout) clearTimeout(this.timeout);

        this.timeout = setTimeout(function () {
            var aveId       = self.view.aveId;
            var pesoOfertas = parseFloat(self.view.$el.find('#pesoOfertas').val()) || 70;
            var ajuste      = parseFloat(self.view.$el.find('#ajustePrecio').val()) || 0;

            Espo.Ajax.postRequest('AvePrincipal/action/recalcularPrecios', {
                aveId:       aveId,
                pesoOfertas: pesoOfertas,
                ajustePrecio: ajuste
            })
            .then(function (response) {
                if (response.success) {
                    var d = response.data;
                    self.view.$el.find('#valorMax').val(d.valorMax);
                    self.view.$el.find('#precioMax').val(d.precioMax);
                    self.view.$el.find('#valorMin').val(d.valorMin);
                    self.view.$el.find('#precioMin').val(d.precioMin);
                    self.view.$el.find('#valorPromedio').val(d.valorPromedio);
                    self.view.$el.find('#precioOriginal').val(d.precioOriginal);
                    // Sincronizar pesoVentas por si el backend lo normalizó
                    self.view.$el.find('#pesoVentas').val(100 - (d.pesoOfertas || pesoOfertas));
                    self.actualizarRango(d.ajustePrecio, d.precioSugerido);
                } else {
                    Espo.Ui.error(response.error || 'Error al recalcular precios');
                }
            })
            .catch(function () {
                Espo.Ui.error('Error al conectar con el servidor');
            });
        }, 400); // 400ms debounce — no spamea mientras el usuario escribe
    };

    PrecioManager.prototype.actualizarRango = function (ajuste, precioSugerido) {
        ajuste        = parseFloat(ajuste)        || 0;
        precioSugerido = parseFloat(precioSugerido) || 0;

        if (precioSugerido > 0) {
            var min = Math.round(precioSugerido * (1 - ajuste / 100));
            var max = Math.round(precioSugerido * (1 + ajuste / 100));

            // Sin decimales, con separador de miles
            var fmt = function (n) {
                return n.toLocaleString('es-VE', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
            };

            this.view.$el.find('#rangoPrecioMinDisplay').text('$ ' + fmt(min));
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ ' + fmt(max));
        } else {
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ 0');
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ 0');
        }
    };

    return PrecioManager;
});