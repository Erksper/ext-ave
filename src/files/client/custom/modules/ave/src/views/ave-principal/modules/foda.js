define('ave:views/ave-principal/modules/foda', [], function () {

    var FodaManager = function (view) {
        this.view = view;
        this.items = { fortaleza: [], debilidad: [] };
    };

    FodaManager.prototype.cargar = function (analisis) {
        this.items = { fortaleza: [], debilidad: [] };
        if (!analisis) return;
        analisis.forEach(function (item) {
            var tipo = item.tipo === 'debilidad' ? 'debilidad' : 'fortaleza';
            this.items[tipo].push({ id: item.id, name: item.name, detalle: item.detalle });
        }.bind(this));
        this.renderizar('fortaleza');
        this.renderizar('debilidad');
    };

    FodaManager.prototype.abrirModal = function () {
        this.view.$el.find('#foda-nombre').val('');
        this.view.$el.find('#foda-detalle').val('');
        this.view.$el.find('input[name="foda-tipo"][value="fortaleza"]').prop('checked', true);
        this.view.$el.find('#btn-guardar-foda').off('click').on('click', function () {
            this.guardarDesdeModal();
        }.bind(this));
        this.view.$el.find('#modalFoda').modal('show');
        setTimeout(function () { this.view.$el.find('#foda-nombre').focus(); }.bind(this), 400);
    };

    FodaManager.prototype.guardarDesdeModal = function () {
        var nombre = this.view.$el.find('#foda-nombre').val().trim();
        if (!nombre) {
            Espo.Ui.warning('El título es requerido');
            this.view.$el.find('#foda-nombre').focus();
            return;
        }
        var tipo = this.view.$el.find('input[name="foda-tipo"]:checked').val();
        var detalle = this.view.$el.find('#foda-detalle').val().trim();
        this.items[tipo].push({ id: null, name: nombre, detalle: detalle });
        this.renderizar(tipo);
        this.view.$el.find('#modalFoda').modal('hide');
        Espo.Ui.success('Agregado correctamente');
    };

    FodaManager.prototype.eliminar = function (tipo, idx) {
        if (!confirm('¿Eliminar este elemento?')) return;
        this.items[tipo].splice(idx, 1);
        this.renderizar(tipo);
        Espo.Ui.success('Eliminado');
    };

    FodaManager.prototype.renderizar = function (tipo) {
        var items = this.items[tipo];
        var listId = tipo === 'fortaleza' ? 'foda-fortalezas' : 'foda-debilidades';
        var $list = this.view.$el.find('#' + listId);
        if (items.length === 0) {
            $list.html('<div style="text-align:center;padding:20px;color:#aaa;">No hay ' + (tipo === 'fortaleza' ? 'fortalezas' : 'debilidades') + ' registradas</div>');
            return;
        }
        var html = '';
        items.forEach(function (item, idx) {
            html += '<div class="ave-foda-item">';
            html += '<div class="ave-foda-item-info">';
            html += '<div class="ave-foda-item-name">' + this.escape(item.name) + '</div>';
            if (item.detalle) html += '<div class="ave-foda-item-detail">' + this.escape(item.detalle) + '</div>';
            html += '</div>';
            html += '<button class="ave-foda-delete-btn" data-action="eliminar-foda" data-tipo="' + tipo + '" data-idx="' + idx + '">';
            html += '<i class="fas fa-times-circle"></i></button>';
            html += '</div>';
        }.bind(this));
        $list.html(html);
    };

    FodaManager.prototype.getData = function () {
        var result = [];
        ['fortaleza', 'debilidad'].forEach(function (tipo) {
            this.items[tipo].forEach(function (item) {
                result.push({ id: item.id, name: item.name, tipo: tipo, detalle: item.detalle });
            });
        }.bind(this));
        return result;
    };

    FodaManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return FodaManager;
});