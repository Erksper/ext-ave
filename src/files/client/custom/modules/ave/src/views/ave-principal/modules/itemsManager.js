define('ave:views/ave-principal/modules/itemsManager', [], function () {

    // Mapa explícito de tipo → IDs del HTML
    var ID_MAP = {
        factor:   { tbody: 'factores-tbody',   emptyRow: 'factores-empty-row',   selectId: 'select-factor'   },
        decision: { tbody: 'decisiones-tbody',  emptyRow: 'decisiones-empty-row', selectId: 'select-decision' },
        canal:    { tbody: 'canales-tbody',     emptyRow: 'canales-empty-row',    selectId: 'select-canal'    },
        plan:     { tbody: 'planes-tbody',      emptyRow: 'planes-empty-row',     selectId: 'select-plan'     }
    };

    var ItemsManager = function (view, tipo, options) {
        this.view            = view;
        this.tipo            = tipo;
        this.items           = [];
        this.catalogo        = [];
        this.labelSingular   = options.labelSingular   || 'ítem';
        this.tieneImpacto    = options.tieneImpacto    || false;
        this.tieneDescripcion = options.tieneDescripcion !== false;
        this._ids            = ID_MAP[tipo] || {
            tbody:    tipo + 's-tbody',
            emptyRow: tipo + '-empty-row',
            selectId: 'select-' + tipo
        };
    };

    // Cargar catálogo desde servidor
    ItemsManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', {
            tipo: this.tipo, teamId: teamId
        })
        .then(function (response) {
            if (response.success && response.data) {
                self.catalogo = response.data;
                self.poblarSelect();
            }
        });
    };

    // Llenar select con items no agregados aún
    ItemsManager.prototype.poblarSelect = function () {
        var self    = this;
        var $select = this.view.$el.find('#' + this._ids.selectId);
        if (!$select.length) return;

        // IDs ya agregados — comparación estricta como string
        var idsAgregados = this.items.map(function (i) { return String(i.id); });

        $select.empty().append('<option value="">-- Seleccione ' + this.labelSingular + ' --</option>');
        this.catalogo.forEach(function (item) {
            if (idsAgregados.indexOf(String(item.id)) === -1) {
                var text = self.escape(item.name);
                if (self.tieneImpacto && item.impacto) {
                    text += ' (' + (item.impacto === 'positivo' ? 'Positivo' : 'Negativo') + ')';
                }
                $select.append('<option value="' + item.id + '">' + text + '</option>');
            }
        });
    };

    // Cargar items ya vinculados al AVE
    ItemsManager.prototype.cargarItems = function (items) {
        this.items = items || [];
        this.renderizar();
        // Repoblar select para excluir los ya agregados
        this.poblarSelect();
    };

    // Agregar desde select
    ItemsManager.prototype.agregarDesdeSelect = function () {
        var $select = this.view.$el.find('#' + this._ids.selectId);
        var id      = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un ' + this.labelSingular + ' primero');
            return;
        }
        var item = this.catalogo.find(function (i) { return String(i.id) === String(id); });
        if (!item) return;

        var newItem = { id: item.id, name: item.name };
        if (this.tieneDescripcion) newItem.descripcion = item.descripcion || '';
        if (this.tieneImpacto)    newItem.impacto      = item.impacto;

        this.items.push(newItem);
        $select.val('');
        this.renderizar();
        this.poblarSelect();
        Espo.Ui.success(this.labelSingular + ' agregado');
    };

    // Abrir modal para nuevo item
    ItemsManager.prototype.abrirModalNuevo = function () {
        var self = this;
        this.view.$el.find('#item-nombre').val('');
        this.view.$el.find('#item-descripcion').val('');

        if (this.tieneDescripcion) {
            this.view.$el.find('#item-descripcion-group').show();
        } else {
            this.view.$el.find('#item-descripcion-group').hide();
        }

        if (this.tieneImpacto) {
            this.view.$el.find('#item-impacto-group').show();
            this.view.$el.find('input[name="item-impacto"][value="positivo"]').prop('checked', true);
        } else {
            this.view.$el.find('#item-impacto-group').hide();
        }

        this.view.$el.find('#item-predeterminado').prop('checked', false);
        this.view.$el.find('#modalItemTitulo').html(
            '<i class="fas fa-plus-circle"></i> Nuevo ' + this.labelSingular
        );

        this.view.$el.find('#btn-guardar-item').off('click').on('click', function () {
            self.crearNuevo();
        });

        this.view.$el.find('#modalItem').modal('show');
        setTimeout(function () { self.view.$el.find('#item-nombre').focus(); }, 400);
    };

    // Crear nuevo item en backend
    ItemsManager.prototype.crearNuevo = function () {
        var self = this;
        var nombre = this.view.$el.find('#item-nombre').val().trim();
        if (!nombre) {
            Espo.Ui.warning('El nombre es requerido');
            this.view.$el.find('#item-nombre').focus();
            return;
        }
        var data = {
            nombre:        nombre,
            tipo:          this.tipo,
            descripcion:   this.tieneDescripcion ? this.view.$el.find('#item-descripcion').val() : '',
            predeterminado:this.view.$el.find('#item-predeterminado').is(':checked'),
            teamId:        this.view.teamId
        };
        if (this.tieneImpacto) {
            data.impacto = this.view.$el.find('input[name="item-impacto"]:checked').val();
        }

        var $btn = this.view.$el.find('#btn-guardar-item');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        Espo.Ajax.postRequest('AvePrincipal/action/crearFactor', data)
            .then(function (response) {
                if (response.success) {
                    var nuevo   = response.data;
                    var newItem = { id: nuevo.id, name: nuevo.name };
                    if (self.tieneDescripcion) newItem.descripcion = nuevo.descripcion || '';
                    if (self.tieneImpacto)    newItem.impacto      = nuevo.impacto;

                    // Agregar al catálogo Y a los items seleccionados
                    self.catalogo.push(nuevo);
                    self.items.push(newItem);
                    self.renderizar();
                    self.poblarSelect();
                    self.view.$el.find('#modalItem').modal('hide');
                    Espo.Ui.success(self.labelSingular + ' creado y agregado');
                } else {
                    Espo.Ui.error(response.error || 'Error al crear');
                }
            })
            .catch(function () { Espo.Ui.error('Error al crear'); })
            .finally(function () { $btn.prop('disabled', false).html(orig); });
    };

    // Quitar item de la lista
    ItemsManager.prototype.quitar = function (idx) {
        this.items.splice(idx, 1);
        this.renderizar();
        this.poblarSelect();
    };

    // Renderizar tabla
    ItemsManager.prototype.renderizar = function () {
        var self     = this;
        var $tbody   = this.view.$el.find('#' + this._ids.tbody);
        var $emptyRow = this.view.$el.find('#' + this._ids.emptyRow);

        if (!$tbody.length) return;

        // Eliminar filas dinámicas (conservar solo la fila vacía)
        $tbody.find('tr').not($emptyRow).remove();

        if (this.items.length === 0) {
            $emptyRow.show();
            return;
        }

        $emptyRow.hide();

        this.items.forEach(function (item, idx) {
            var $tr = $('<tr>');

            // Columna nombre
            $tr.append($('<td>').css('font-weight', '600').text(item.name));

            // Columna descripción (si aplica)
            if (self.tieneDescripcion) {
                $tr.append($('<td>').css('color', 'var(--ave-text-muted)').text(item.descripcion || ''));
            }

            // Columna impacto (solo factores)
            if (self.tieneImpacto) {
                var $impacto = item.impacto === 'positivo'
                    ? $('<span class="ave-impacto-positivo">').html('&#9650; Positivo')
                    : $('<span class="ave-impacto-negativo">').html('&#9660; Negativo');
                $tr.append($('<td>').css('text-align', 'center').append($impacto));
            }

            // Columna botón quitar — usando jQuery directo en lugar de HTML string
            var $btn = $('<button>')
                .addClass('ave-btn-quitar')
                .attr('title', 'Quitar')
                .html('<i class="fas fa-times"></i>')
                .on('click', function (e) {
                    e.stopPropagation();
                    self.quitar(idx);
                });

            $tr.append($('<td>').css('text-align', 'center').append($btn));
            $tbody.append($tr);
        });
    };

    // Obtener datos para guardar
    ItemsManager.prototype.getData = function () {
        return this.items.map(function (i) {
            var item = { id: i.id, name: i.name };
            if (this.tieneDescripcion) item.descripcion = i.descripcion || '';
            if (this.tieneImpacto)    item.impacto      = i.impacto;
            return item;
        }.bind(this));
    };

    ItemsManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return ItemsManager;
});