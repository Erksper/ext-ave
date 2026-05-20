define('ave:views/ave-principal/modules/precio', [], function () {

    var PrecioManager = function (view) {
        this.view = view;
    };

    PrecioManager.prototype.poblar = function (ave) {
        var set = function (id, val) {
            this.view.$el.find('#' + id).val(val || '');
        }.bind(this);

        set('valorMax',       ave.valorMax);
        set('precioMax',      ave.precioMax);
        set('valorMin',       ave.valorMin);
        set('precioMin',      ave.precioMin);
        set('valorPromedio',  ave.valorPromedio);
        set('precioOriginal', ave.precioOriginal);
        set('ajustePrecio',   ave.ajustePrecio);
        set('precioSugerido', ave.precioSugerido);

        this.actualizarDisplay(ave.precioSugerido || 0);

        // Listeners para recalcular precio sugerido
        var self = this;
        this.view.$el.find('#precioOriginal, #ajustePrecio').off('input.precio').on('input.precio', function () {
            self.calcular();
        });
    };

    PrecioManager.prototype.calcular = function () {
        var precioOriginal = parseFloat(this.view.$el.find('#precioOriginal').val()) || 0;
        var ajuste         = parseFloat(this.view.$el.find('#ajustePrecio').val())   || 0;

        var sugerido = 0;
        if (precioOriginal > 0) {
            sugerido = precioOriginal * (1 + ajuste / 100);
        }

        sugerido = Math.round(sugerido * 100) / 100;
        this.view.$el.find('#precioSugerido').val(sugerido);
        this.actualizarDisplay(sugerido);
    };

    PrecioManager.prototype.actualizarDisplay = function (valor) {
        var formatted = valor > 0
            ? '$ ' + parseFloat(valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '$ 0.00';
        this.view.$el.find('#precioSugeridoDisplay').text(formatted);
    };

    return PrecioManager;
});
