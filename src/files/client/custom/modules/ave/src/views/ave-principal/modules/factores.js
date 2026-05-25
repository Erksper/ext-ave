define('ave:views/ave-principal/modules/factores', [], function () {

    var FactoresManager = function (view) {
        this.view = view;
        this.items = [];      // factores seleccionados para este AVE
        this.catalogo = [];   // todos los factores disponibles (desde backend)
    };

    // Cargar catálogo desde servidor
    FactoresManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', { tipo: 'factor', teamId: teamId })
            .then(function (response) {
                if (response.success && response.data) {
                    self.catalogo = response.data;
                    self.poblarSelect();
                }
            });
    };

    // Llenar el select con factores no agregados aún
    FactoresManager.prototype.poblarSelect = function () {
        var self = this;
        var $select = this.view.$el.find('#select-factor');
        $select.empty().append('<option value="">-- Seleccione un factor --</option>');
        var idsAgregados = this.items.map(function (i) { return i.id; });
        this.catalogo.forEach(function (f) {
            if (idsAgregados.indexOf(f.id) === -1) {
                $select.append('<option value="' + f.id + '">' + self.escape(f.name) + ' (' + (f.impacto === 'positivo' ? 'Positivo' : 'Negativo') + ')</option>');
            }
        });
    };

    // Cargar items ya vinculados al AVE
    FactoresManager.prototype.cargarItems = function (factores) {
        this.items = factores || [];
        this.renderizar();
    };

    // Agregar factor desde el select
    FactoresManager.prototype.agregarDesdeSelect = function () {
        var $select = this.view.$el.find('#select-factor');
        var id = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un factor primero');
            return;
        }
        var factor = this.catalogo.find(function (f) { return f.id == id; });
        if (!factor) return;
        this.items.push({ id: factor.id, name: factor.name, impacto: factor.impacto });
        $select.val('');
        this.renderizar();
        this.poblarSelect();
        Espo.Ui.success('Factor agregado');
    };

    // Abrir modal para nuevo factor
    FactoresManager.prototype.abrirModalNuevo = function () {
        var self = this;
        this.view.$el.find('#factor-nombre').val('');
        this.view.$el.find('input[name="factor-impacto"][value="positivo"]').prop('checked', true);
        this.view.$el.find('#btn-guardar-factor').off('click').on('click', function () {
            self.crearNuevo();
        });
        this.view.$el.find('#modalFactor').modal('show');
        setTimeout(function () { self.view.$el.find('#factor-nombre').focus(); }, 400);
    };

    // Crear nuevo factor (backend)
    FactoresManager.prototype.crearNuevo = function () {
        var self = this;
        var nombre = this.view.$el.find('#factor-nombre').val().trim();
        var impacto = this.view.$el.find('input[name="factor-impacto"]:checked').val();
        if (!nombre) {
            Espo.Ui.warning('El nombre es requerido');
            this.view.$el.find('#factor-nombre').focus();
            return;
        }
        var $btn = this.view.$el.find('#btn-guardar-factor');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        Espo.Ajax.postRequest('AvePrincipal/action/crearFactor', {
            nombre: nombre,
            tipo: 'factor',
            impacto: impacto,
            teamId: this.view.teamId
        })
        .then(function (response) {
            if (response.success) {
                var nuevo = response.data;
                self.catalogo.push(nuevo);
                self.items.push({ id: nuevo.id, name: nuevo.name, impacto: nuevo.impacto });
                self.renderizar();
                self.poblarSelect();
                self.view.$el.find('#modalFactor').modal('hide');
                Espo.Ui.success('Factor creado y agregado');
            } else {
                Espo.Ui.error(response.error || 'Error al crear');
            }
        })
        .catch(function () { Espo.Ui.error('Error al crear'); })
        .finally(function () { $btn.prop('disabled', false).html(orig); });
    };

    // Quitar factor seleccionado
    FactoresManager.prototype.quitar = function (idx) {
        this.items.splice(idx, 1);
        this.renderizar();
        this.poblarSelect();
    };

    // Renderizar tabla de factores
    FactoresManager.prototype.renderizar = function () {
        var $tbody = this.view.$el.find('#factores-tbody');
        var $empty = this.view.$el.find('#factores-empty-row');
        if (this.items.length === 0) {
            $empty.show();
            return;
        }
        $empty.hide();
        var rows = '';
        this.items.forEach(function (item, idx) {
            var impactoHtml = item.impacto === 'positivo'
                ? '<span class="ave-impacto-positivo">&#9650; Positivo</span>'
                : '<span class="ave-impacto-negativo">&#9660; Negativo</span>';
            rows += '<tr>';
            rows += '<td>' + this.escape(item.name) + '</td>';
            rows += '<td style="text-align:center;">' + impactoHtml + '</td>';
            rows += '<td style="text-align:center;"><button class="ave-btn-quitar" data-action="quitar-factor" data-idx="' + idx + '" title="Quitar"><i class="fas fa-times"></i></button></td>';
            rows += '</tr>';
        }.bind(this));
        $tbody.find('tr:not(#factores-empty-row)').remove();
        $tbody.append(rows);
    };

    // Obtener datos para guardar
    FactoresManager.prototype.getData = function () {
        return this.items.map(function (i) { return { id: i.id, name: i.name, impacto: i.impacto }; });
    };

    FactoresManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return FactoresManager;
});