define('ave:views/ave-principal/modules/foda', [], function () {

    var FodaManager = function (view) {
        this.view     = view;
        this.catalogo = [];           // títulos disponibles
        this.items    = { fortaleza: [], debilidad: [] }; // respuestas del AVE
    };

    // ─────────────────────────────────────────────
    // Catálogo de títulos
    // ─────────────────────────────────────────────
    FodaManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        Espo.Ajax.getRequest('AvePrincipal/action/getCatalogoAnalisis', { teamId: teamId })
            .then(function (response) {
                if (response.success) {
                    self.catalogo = response.data || [];
                    self.poblarSelect();
                }
            });
    };

    FodaManager.prototype.poblarSelect = function () {
        var self    = this;
        var $select = this.view.$el.find('#select-foda');
        $select.empty().append('<option value="">-- Seleccione un título --</option>');
        this.catalogo.forEach(function (item) {
            $select.append(
                '<option value="' + item.id + '">' + self.escape(item.name) + '</option>'
            );
        });
    };

    // ─────────────────────────────────────────────
    // Carga inicial de respuestas del AVE
    // ─────────────────────────────────────────────
    FodaManager.prototype.cargar = function (analisis) {
        this.items = { fortaleza: [], debilidad: [] };
        if (!analisis) { this.renderizar('fortaleza'); this.renderizar('debilidad'); return; }
        analisis.forEach(function (item) {
            var tipo = item.tipo === 'debilidad' ? 'debilidad' : 'fortaleza';
            this.items[tipo].push({
                id:            item.id,
                aveAnalisisId: item.aveAnalisisId,
                tituloName:    item.tituloName,
                tipo:          tipo,
                descripcion:   item.descripcion,
            });
        }.bind(this));
        this.renderizar('fortaleza');
        this.renderizar('debilidad');
    };

    // ─────────────────────────────────────────────
    // Modal — agregar respuesta
    // ─────────────────────────────────────────────
    FodaManager.prototype.abrirModalAgregar = function () {
        var self      = this;
        var $select   = this.view.$el.find('#select-foda');
        var id        = $select.val();
        var tituloName = $select.find('option:selected').text();

        if (!id) {
            Espo.Ui.warning('Seleccione un título primero');
            return;
        }

        this.view.$el.find('#foda-modal-analisis-id').val(id);
        this.view.$el.find('#foda-modal-titulo-texto').val(tituloName);
        this.view.$el.find('input[name="foda-tipo"][value="fortaleza"]').prop('checked', true);
        this.view.$el.find('#foda-descripcion').val('');

        this.view.$el.find('#btn-guardar-foda').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        this.view.$el.find('#modalFoda').modal('show');
        setTimeout(function () { self.view.$el.find('#foda-descripcion').focus(); }, 400);
    };

    FodaManager.prototype.guardarDesdeModal = function () {
        var descripcion = this.view.$el.find('#foda-descripcion').val().trim();
        if (!descripcion) {
            Espo.Ui.warning('La descripción es obligatoria');
            this.view.$el.find('#foda-descripcion').focus();
            return;
        }

        var aveAnalisisId = this.view.$el.find('#foda-modal-analisis-id').val();
        var tituloName    = this.view.$el.find('#foda-modal-titulo-texto').val();
        var tipo          = this.view.$el.find('input[name="foda-tipo"]:checked').val();

        this.items[tipo].push({
            id:            null,
            aveAnalisisId: aveAnalisisId,
            tituloName:    tituloName,
            tipo:          tipo,
            descripcion:   descripcion,
        });

        this.renderizar(tipo);
        this.view.$el.find('#modalFoda').modal('hide');
        Espo.Ui.success('Agregado correctamente');
    };

    // ─────────────────────────────────────────────
    // Modal — nuevo título
    // ─────────────────────────────────────────────
    FodaManager.prototype.abrirModalNuevoTitulo = function () {
        var self = this;
        this.view.$el.find('#foda-nuevo-titulo').val('');
        this.view.$el.find('#foda-nuevo-predeterminado').prop('checked', false);

        this.view.$el.find('#btn-guardar-titulo-foda').off('click').on('click', function () {
            self.crearNuevoTitulo();
        });

        this.view.$el.find('#modalFodaTitulo').modal('show');
        setTimeout(function () { self.view.$el.find('#foda-nuevo-titulo').focus(); }, 400);
    };

    FodaManager.prototype.crearNuevoTitulo = function () {
        var self  = this;
        var name  = this.view.$el.find('#foda-nuevo-titulo').val().trim();
        if (!name) {
            Espo.Ui.warning('El título es requerido');
            this.view.$el.find('#foda-nuevo-titulo').focus();
            return;
        }

        var $btn = this.view.$el.find('#btn-guardar-titulo-foda');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        Espo.Ajax.postRequest('AvePrincipal/action/crearAnalisisTitulo', {
            name:           name,
            predeterminado: this.view.$el.find('#foda-nuevo-predeterminado').is(':checked'),
            teamId:         this.view.teamId
        })
        .then(function (response) {
            if (response.success) {
                self.catalogo.push(response.data);
                self.poblarSelect();
                // Preseleccionar el recién creado
                self.view.$el.find('#select-foda').val(response.data.id);
                self.view.$el.find('#modalFodaTitulo').modal('hide');
                Espo.Ui.success('Título creado. Ahora selecciónelo y pulse "Agregar".');
            } else {
                Espo.Ui.error(response.error || 'Error al crear el título');
            }
        })
        .catch(function () { Espo.Ui.error('Error al crear el título'); })
        .finally(function () { $btn.prop('disabled', false).html(orig); });
    };

    // ─────────────────────────────────────────────
    // Eliminar
    // ─────────────────────────────────────────────
    FodaManager.prototype.eliminar = function (tipo, idx) {
        if (!confirm('¿Eliminar este elemento?')) return;
        this.items[tipo].splice(idx, 1);
        this.renderizar(tipo);
        Espo.Ui.success('Eliminado');
    };

    // ─────────────────────────────────────────────
    // Renderizar columnas
    // ─────────────────────────────────────────────
    FodaManager.prototype.renderizar = function (tipo) {
        var self   = this;
        var items  = this.items[tipo];
        var listId = tipo === 'fortaleza' ? 'foda-fortalezas' : 'foda-debilidades';
        var $list  = this.view.$el.find('#' + listId);

        if (items.length === 0) {
            $list.html(
                '<div style="text-align:center; padding:20px; color:#aaa; font-size:13px;">' +
                'No hay ' + (tipo === 'fortaleza' ? 'fortalezas' : 'debilidades') + ' registradas' +
                '</div>'
            );
            return;
        }

        var html = '';
        items.forEach(function (item, idx) {
            html += '<div class="ave-foda-item">';
            html += '<div class="ave-foda-item-info">';
            html += '<div class="ave-foda-item-name">' + self.escape(item.tituloName) + '</div>';
            html += '<div class="ave-foda-item-detail">' + self.escape(item.descripcion) + '</div>';
            html += '</div>';
            html += '<button class="ave-foda-delete-btn" data-action="eliminar-foda" ' +
                    'data-tipo="' + tipo + '" data-idx="' + idx + '">' +
                    '<i class="fas fa-times-circle"></i></button>';
            html += '</div>';
        });

        $list.html(html);
    };

    // ─────────────────────────────────────────────
    // getData — para guardar
    // ─────────────────────────────────────────────
    FodaManager.prototype.getData = function () {
        var result = [];
        ['fortaleza', 'debilidad'].forEach(function (tipo) {
            this.items[tipo].forEach(function (item) {
                result.push({
                    id:            item.id,
                    aveAnalisisId: item.aveAnalisisId,
                    tipo:          item.tipo,
                    descripcion:   item.descripcion,
                });
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