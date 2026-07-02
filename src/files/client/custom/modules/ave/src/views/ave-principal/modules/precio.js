define('ave:views/ave-principal/modules/precio', [], function () {

    var PrecioManager = function (view) {
        this.view = view;
        this.timeout = null;
        this.referenciasPromocion = [];
        this.referenciasVendidos = [];
        this.areaInmueble = 0;
    };

    PrecioManager.prototype.poblar = function (ave) {
        this.actualizarDatosBase();
        
        this.view.$el.find('#valorMax').val(ave.valorMax || '');
        this.view.$el.find('#precioMax').val(ave.precioMax || '');
        this.view.$el.find('#valorPromedio').val(ave.valorPromedio || '');
        this.view.$el.find('#valorMin').val(ave.valorMin || '');
        this.view.$el.find('#precioMin').val(ave.precioMin || '');
        this.view.$el.find('#precioOriginal').val(ave.precioOriginal || '');

        var pesoOfertas = (ave.pesoOfertas !== undefined && ave.pesoOfertas !== null && ave.pesoOfertas !== '')
            ? parseFloat(ave.pesoOfertas) : 50;

        this.view.$el.find('#pesoOfertas').val(pesoOfertas);
        this.view.$el.find('#pesoVentas').val(100 - pesoOfertas);
        this.view.$el.find('#ajustePrecio').val(ave.ajustePrecio || 0);

        this.initEventos();
        
        // Calcular precios inmediatamente
        this.calcularPrecios();
    };

    PrecioManager.prototype.actualizarDatosBase = function () {
        if (this.view.referenciasManager) {
            this.referenciasPromocion = this.view.referenciasManager.items.promocion || [];
            this.referenciasVendidos = this.view.referenciasManager.items.vendido || [];
        }
        
        if (this.view.inmuebleManager && this.view.inmuebleManager.inmuebleActual) {
            this.areaInmueble = parseFloat(this.view.inmuebleManager.inmuebleActual.areaConstruida) || 0;
        }
    };

    PrecioManager.prototype.calcularPrecios = function () {
        // Calcular precios M2 de referencias en promoción
        var sumaPreciosProm = 0;
        var sumaAreasProm = 0;
        var preciosM2Prom = [];
        
        this.referenciasPromocion.forEach(function(ref) {
            if (ref.usarCalculo !== false) {
                var precio = parseFloat(ref.valorReferencial) || 0;
                var area = parseFloat(ref.areaConstruida) || 0;
                if (precio > 0 && area > 0) {
                    var precioM2 = precio / area;
                    sumaPreciosProm += precio;
                    sumaAreasProm += area;
                    preciosM2Prom.push(precioM2);
                }
            }
        });
        
        // Calcular precios M2 de referencias vendidas
        var sumaPreciosVen = 0;
        var sumaAreasVen = 0;
        var preciosM2Ven = [];
        
        this.referenciasVendidos.forEach(function(ref) {
            if (ref.usarCalculo !== false) {
                var precio = parseFloat(ref.valorReferencial) || 0;
                var area = parseFloat(ref.areaConstruida) || 0;
                if (precio > 0 && area > 0) {
                    var precioM2 = precio / area;
                    sumaPreciosVen += precio;
                    sumaAreasVen += area;
                    preciosM2Ven.push(precioM2);
                }
            }
        });
        
        // Calcular promedios
        var precioM2Ofertas = sumaAreasProm > 0 ? sumaPreciosProm / sumaAreasProm : 0;
        var precioM2Ventas = sumaAreasVen > 0 ? sumaPreciosVen / sumaAreasVen : 0;
        
        // Obtener todos los precios M2 para min/max
        var todosLosPreciosM2 = [...preciosM2Prom, ...preciosM2Ven];
        var valorMaxM2 = todosLosPreciosM2.length > 0 ? Math.max(...todosLosPreciosM2) : 0;
        var valorMinM2 = todosLosPreciosM2.length > 0 ? Math.min(...todosLosPreciosM2) : 0;
        
        // Obtener pesos
        var pesoOfertas = parseFloat(this.view.$el.find('#pesoOfertas').val()) || 50;
        var pesoVentas = 100 - pesoOfertas;
        
        // Calcular precio M2 ponderado
        var precioM2Ponderado = (precioM2Ofertas * pesoOfertas / 100) + (precioM2Ventas * pesoVentas / 100);
        
        // Calcular precios en USD
        var precioMaximo = valorMaxM2 * this.areaInmueble;
        var precioMinimo = valorMinM2 * this.areaInmueble;
        var precioVentaBase = precioM2Ponderado * this.areaInmueble;
        
        // Aplicar ajuste para el precio sugerido
        var ajuste = parseFloat(this.view.$el.find('#ajustePrecio').val()) || 0;
        
        // Actualizar inputs
        this.view.$el.find('#valorMax').val(valorMaxM2.toFixed(2));
        this.view.$el.find('#precioMax').val(Math.round(precioMaximo));
        this.view.$el.find('#valorPromedio').val(precioM2Ponderado.toFixed(2));
        this.view.$el.find('#valorMin').val(valorMinM2.toFixed(2));
        this.view.$el.find('#precioMin').val(Math.round(precioMinimo));
        this.view.$el.find('#precioOriginal').val(Math.round(precioVentaBase));
        
        // Actualizar rango (usando el ajuste sobre el precio base)
        this.actualizarRango(ajuste, precioVentaBase);
        
        // Actualizar peso ventas
        this.view.$el.find('#pesoVentas').val(pesoVentas);
    };

    PrecioManager.prototype.initEventos = function () {
        var self = this;

        this.view.$el.find('#pesoOfertas').off('input.precio change.precio').on('input.precio change.precio', function () {
            var val = parseInt($(this).val());
            if (isNaN(val) || val < 1) val = 1;
            if (val > 99) val = 99;
            $(this).val(val);
            self.view.$el.find('#pesoVentas').val(100 - val);
            self.calcularPrecios();
        });

        this.view.$el.find('#ajustePrecio').off('input.precio').on('input.precio', function () {
            var val = parseInt($(this).val()) || 0;
            val = Math.min(100, Math.max(-100, val));
            $(this).val(val);
            
            var precioBase = parseFloat(self.view.$el.find('#precioOriginal').val()) || 0;
            self.actualizarRango(val, precioBase);
        });
    };

    PrecioManager.prototype.actualizarRango = function (ajuste, precioBase) {
        ajuste = parseFloat(ajuste) || 0;
        precioBase = parseFloat(precioBase) || 0;

        var fmt = function (n) {
            return n.toLocaleString('es-VE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        };

        if (precioBase > 0) {
            var min = Math.round(precioBase * (1 - ajuste / 100));
            var max = Math.round(precioBase * (1 + ajuste / 100));
            
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ ' + fmt(min));
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ ' + fmt(max));
        } else {
            this.view.$el.find('#rangoPrecioMinDisplay').text('$ 0');
            this.view.$el.find('#rangoPrecioMaxDisplay').text('$ 0');
        }
    };
    
    PrecioManager.prototype.recargar = function () {
        this.actualizarDatosBase();
        this.calcularPrecios();
    };

    return PrecioManager;
});