define('ave:views/ave-principal/list', ['view'], function (Dep) {

    return Dep.extend({

        template: 'ave:ave-principal/list',

        pagina: 1,
        porPagina: 20,
        totalRegistros: 0,
        totalPaginas: 0,
        datos: [],

        // Mapa de estados - solo dos opciones
        statusMap: {
            'elaboracion': { texto: 'En Elaboración', clase: 'ave-status-elaboracion', nextStatus: 'impresion', nextButtonText: 'Aprobar', buttonClass: 'success' },
            'impresion':   { texto: 'Listo para Imprimir', clase: 'ave-status-impresion', nextStatus: null, nextButtonText: 'Imprimir', buttonClass: 'primary' }
        },

        events: {
            'click [data-action="crear-nuevo"]': function () {
                this.crearNuevo();
            },
            'click [data-action="filtrar"]': function () {
                this.pagina = 1;
                this.cargarLista();
            },
            'click [data-action="limpiar-filtros"]': function () {
                this.limpiarFiltros();
            },
            'click [data-action="ver-ave"]': function (e) {
                this.verAve($(e.currentTarget).data('id'));
            },
            'click [data-action="cambiar-status"]': function (e) {
                var id = $(e.currentTarget).data('id');
                var statusActual = $(e.currentTarget).data('status');
                this.cambiarStatus(id, statusActual);
            },
            'click .pag-btn': function (e) {
                var pagina = $(e.currentTarget).data('pagina');
                if (pagina && pagina !== this.pagina) {
                    this.pagina = pagina;
                    this.cargarLista();
                }
            },
            'keypress #filtro-numero, #filtro-cliente, #filtro-identificacion, #filtro-asesor': function (e) {
                if (e.which === 13) { this.pagina = 1; this.cargarLista(); }
            }
        },

        setup: function () {
            Dep.prototype.setup.call(this);
            console.log('list.setup() - Inicializando vista de lista');
            var user = this.getUser();
            this.puedeAprobar = user.get('isAdmin') || (user.get('rolesIds') || []).length > 0;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            console.log('list.afterRender() - Cargando lista inicial');
            this.cargarLista();
        },

        cargarLista: function () {
            var self = this;
            console.log('cargarLista() - Página:', this.pagina, 'Por página:', this.porPagina);
            
            this.$el.find('#ave-list-loading').show();
            this.$el.find('#ave-list-content').hide();

            var filtroStatus = this.$el.find('#filtro-status').val() || '';
            console.log('Filtro de estado actual:', filtroStatus);

            var params = {
                pagina: this.pagina,
                porPagina: this.porPagina,
                numero: this.$el.find('#filtro-numero').val() || '',
                cliente: this.$el.find('#filtro-cliente').val() || '',
                identificacion: this.$el.find('#filtro-identificacion').val() || '',
                asesor: this.$el.find('#filtro-asesor').val() || '',
                status: filtroStatus
            };

            console.log('Parámetros enviados al servidor:', params);

            Espo.Ajax.getRequest('AvePrincipal/action/getLista', params)
                .then(function (response) {
                    console.log('Respuesta del servidor COMPLETA:', response);
                    
                    self.$el.find('#ave-list-loading').hide();
                    self.$el.find('#ave-list-content').show();

                    if (response.success) {
                        self.datos = response.data.list || [];
                        self.totalRegistros = response.data.total || 0;
                        self.totalPaginas = response.data.totalPaginas || 0;
                        
                        console.log('Datos recibidos - Total registros:', self.totalRegistros);
                        console.log('Primer registro (si existe):', self.datos[0]);
                        console.log('Estados de los registros:', self.datos.map(function(r) { return r.status; }));
                        
                        self.renderizarTabla();
                        self.renderizarPaginacion();
                    } else {
                        console.error('Error en respuesta:', response.error);
                        Espo.Ui.error(response.error || 'Error al cargar la lista');
                    }
                })
                .catch(function (error) {
                    console.error('Error en petición AJAX:', error);
                    self.$el.find('#ave-list-loading').hide();
                    self.$el.find('#ave-list-content').show();
                    Espo.Ui.error('Error al cargar los avalúos');
                });
        },

        renderizarTabla: function () {
            console.log('renderizarTabla() - Iniciando renderizado. Datos length:', this.datos.length);
            var self = this;
            var $tbody = this.$el.find('#ave-list-tbody');
            var $noData = this.$el.find('#ave-no-data');

            this.$el.find('#ave-total-count').text(this.totalRegistros);

            if (this.datos.length === 0) {
                console.log('No hay datos para mostrar');
                $tbody.html('');
                $noData.show();
                this.$el.find('#ave-paginacion').hide();
                return;
            }

            $noData.hide();
            var offset = (this.pagina - 1) * this.porPagina;
            var html = '';

            this.datos.forEach(function (item, idx) {
                var fecha = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('es-ES')
                    : '-';
                var identificacion = (item.tipoIdentificacion ? item.tipoIdentificacion + ' ' : '') + (item.identificacionCliente || '-');
                var status = item.status || 'elaboracion';
                var statusInf = self.statusMap[status] || { texto: status, clase: '' };
                
                // Determinar el botón de acción según el estado
                var actionButton = '';
                if (status === 'elaboracion') {
                    // Estado En Elaboración → Botón Aprobar
                    actionButton = '<button class="ave-btn ave-btn-success ave-btn-sm" data-action="cambiar-status" data-id="' + item.id + '" data-status="' + status + '" style="margin-left: 5px;" title="Aprobar y pasar a Listo para Imprimir">';
                    actionButton += '<i class="fas fa-check"></i> Aprobar';
                    actionButton += '</button>';
                } else if (status === 'impresion') {
                    // Estado Listo para Imprimir → Botón Imprimir
                    actionButton = '<button class="ave-btn ave-btn-primary ave-btn-sm" data-action="cambiar-status" data-id="' + item.id + '" data-status="' + status + '" style="margin-left: 5px;" title="Imprimir reporte PDF">';
                    actionButton += '<i class="fas fa-print"></i> Imprimir';
                    actionButton += '</button>';
                }

                html += '<tr>';
                html += '<td style="text-align:center; font-weight:600;">' + (offset + idx + 1) + '</td>';
                html += '<td><strong>' + self.escape(item.numeroAve || '-') + '</strong></td>';
                html += '<td>' + self.escape(item.nombreCliente || '-') + '</td>';
                html += '<td>' + self.escape(identificacion) + '</td>';
                html += '<td>' + self.escape(item.aveInmuebleName || '-') + '</td>';
                html += '<td>' + self.escape(item.assignedUserName || '-') + '</td>';
                html += '<td>' + fecha + '</td>';
                html += '<td style="text-align:center;">';
                html += '<span class="ave-leyenda-badge ' + statusInf.clase + '">' + statusInf.texto + '</span>';
                html += '</td>';
                html += '<td style="text-align:center; white-space: nowrap;">';
                html += '<button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="ver-ave" data-id="' + item.id + '" title="Ver"><i class="fas fa-eye"></i> Ver</button>';
                html += actionButton;
                html += '</td>';
                html += '</tr>';
            });

            $tbody.html(html);
            console.log('Tabla renderizada correctamente');
        },

        renderizarPaginacion: function () {
            if (this.totalPaginas <= 1) {
                this.$el.find('#ave-paginacion').hide();
                return;
            }
            this.$el.find('#ave-paginacion').show();
            var inicio = (this.pagina - 1) * this.porPagina + 1;
            var fin = Math.min(this.pagina * this.porPagina, this.totalRegistros);
            this.$el.find('#ave-page-info').text('Mostrando ' + inicio + '-' + fin + ' de ' + this.totalRegistros);

            var html = '';
            html += '<button class="ave-pag-btn ' + (this.pagina === 1 ? 'disabled' : '') + '" data-pagina="' + (this.pagina - 1) + '"><i class="fas fa-chevron-left"></i></button>';
            var ini = Math.max(1, this.pagina - 2);
            var fin2 = Math.min(this.totalPaginas, this.pagina + 2);
            if (ini > 1) { html += '<button class="ave-pag-btn" data-pagina="1">1</button>'; if (ini > 2) html += '<span style="padding:0 4px;">…</span>'; }
            for (var i = ini; i <= fin2; i++) {
                html += '<button class="ave-pag-btn ' + (i === this.pagina ? 'active' : '') + '" data-pagina="' + i + '">' + i + '</button>';
            }
            if (fin2 < this.totalPaginas) { if (fin2 < this.totalPaginas - 1) html += '<span style="padding:0 4px;">…</span>'; html += '<button class="ave-pag-btn" data-pagina="' + this.totalPaginas + '">' + this.totalPaginas + '</button>'; }
            html += '<button class="ave-pag-btn ' + (this.pagina === this.totalPaginas ? 'disabled' : '') + '" data-pagina="' + (this.pagina + 1) + '"><i class="fas fa-chevron-right"></i></button>';

            this.$el.find('#ave-pag-controles').html(html);
        },

        cambiarStatus: function (id, statusActual) {
            var self = this;
            
            console.log('=== cambiarStatus ===');
            console.log('ID:', id);
            console.log('Status Actual:', statusActual);
            
            // Si está en elaboración → Aprobar (cambiar a impresion)
            if (statusActual === 'elaboracion') {
                if (!confirm('¿Está seguro de aprobar este AVE? Pasará a estado "Listo para Imprimir".')) {
                    return;
                }
                
                var $btn = this.$el.find('[data-action="cambiar-status"][data-id="' + id + '"]');
                var originalHtml = $btn.html();
                $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
                
                console.log('Enviando petición para cambiar a impresion...');
                
                Espo.Ajax.postRequest('AvePrincipal/action/cambiarStatus', {
                    aveId: id,
                    status: 'impresion'
                }).then(function (response) {
                    console.log('Respuesta del servidor:', response);
                    if (response.success) {
                        console.log('Estado cambiado exitosamente a:', response.status);
                        Espo.Ui.success('AVE aprobado correctamente. Estado: Listo para Imprimir');
                        // Recargar la lista completa para mostrar el nuevo estado
                        self.pagina = 1;
                        self.cargarLista();
                    } else {
                        console.error('Error en respuesta:', response.error);
                        Espo.Ui.error(response.error || 'Error al cambiar estado');
                        $btn.prop('disabled', false).html(originalHtml);
                    }
                }).catch(function (error) {
                    console.error('Error en petición:', error);
                    Espo.Ui.error('Error al cambiar el estado');
                    $btn.prop('disabled', false).html(originalHtml);
                });
            } 
            // Si está en impresion → Imprimir PDF
            else if (statusActual === 'impresion') {
                if (!confirm('¿Desea imprimir el reporte de este AVE?')) {
                    return;
                }
                
                var $btn = this.$el.find('[data-action="cambiar-status"][data-id="' + id + '"]');
                var originalHtml = $btn.html();
                $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
                
                // Abrir PDF en nueva pestaña
                window.open('api/v1/AvePrincipal/action/generarPdf?aveId=' + id, '_blank');
                
                $btn.prop('disabled', false).html(originalHtml);
                Espo.Ui.success('Generando PDF...');
            }
        },

        crearNuevo: function () {
            console.log('crearNuevo()');
            var self = this;
            Espo.Ajax.postRequest('AvePrincipal', { name: 'Nuevo AVE' })
                .then(function (response) {
                    if (response && response.id) {
                        self.getRouter().navigate('#AvePrincipal/view/' + response.id, { trigger: true });
                    } else {
                        Espo.Ui.error('No se pudo crear el avalúo');
                    }
                }).catch(function () { Espo.Ui.error('Error al crear el avalúo'); });
        },

        verAve: function (id) {
            console.log('verAve() - ID:', id);
            if (id) this.getRouter().navigate('#AvePrincipal/view/' + id, { trigger: true });
        },

        limpiarFiltros: function () {
            console.log('limpiarFiltros()');
            this.$el.find('#filtro-numero, #filtro-cliente, #filtro-identificacion, #filtro-asesor').val('');
            this.$el.find('#filtro-status').val('');
            this.pagina = 1;
            this.cargarLista();
        },

        escape: function (text) {
            if (!text) return '';
            return String(text).replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        }
    });
});