define('ave:views/ave-principal/list', ['view'], function (Dep) {

    return Dep.extend({

        template: 'ave:ave-principal/list',

        pagina: 1,
        porPagina: 20,
        totalRegistros: 0,
        totalPaginas: 0,
        datos: [],

        events: {
            'click [data-action="crear-nuevo"]': function () {
                this.crearNuevo();
            },
            'click [data-action="filtrar"]': function () {
                console.log('Filtrar clickeado');
                this.pagina = 1;
                this.cargarLista();
            },
            'click [data-action="limpiar-filtros"]': function () {
                console.log('Limpiar filtros clickeado');
                this.limpiarFiltros();
            },
            'click [data-action="ver-ave"]': function (e) {
                var id = $(e.currentTarget).data('id');
                console.log('Evento ver-ave - ID:', id);
                this.verAve(id);
            },
            'click .pag-btn': function (e) {
                var pagina = $(e.currentTarget).data('pagina');
                console.log('Paginación clickeada - página:', pagina);
                if (pagina && pagina !== this.pagina) {
                    this.pagina = pagina;
                    this.cargarLista();
                }
            },
            'keypress #filtro-numero, #filtro-cliente, #filtro-identificacion, #filtro-asesor': function (e) {
                if (e.which === 13) {
                    console.log('Enter presionado en filtro');
                    this.pagina = 1;
                    this.cargarLista();
                }
            }
        },

        setup: function () {
            Dep.prototype.setup.call(this);
            console.log('list.setup() - Inicializando vista de lista');
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

            var params = {
                pagina: this.pagina,
                porPagina: this.porPagina,
                numero: this.$el.find('#filtro-numero').val() || '',
                cliente: this.$el.find('#filtro-cliente').val() || '',
                identificacion: this.$el.find('#filtro-identificacion').val() || '',
                asesor: this.$el.find('#filtro-asesor').val() || ''
            };

            console.log('Parámetros de la petición:', params);

            Espo.Ajax.getRequest('AvePrincipal/action/getLista', params)
                .then(function (response) {
                    console.log('Respuesta del servidor:', response);
                    
                    self.$el.find('#ave-list-loading').hide();
                    self.$el.find('#ave-list-content').show();

                    if (response.success) {
                        self.datos = response.data.list || [];
                        self.totalRegistros = response.data.total || 0;
                        self.totalPaginas = response.data.totalPaginas || 0;
                        
                        console.log('Datos recibidos - Total registros:', self.totalRegistros);
                        console.log('Datos recibidos - Longitud de lista:', self.datos.length);
                        
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
            console.log('renderizarTabla() - Iniciando renderizado');
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
                var fecha = item.createdAtFormatted || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : '-');
                var inmuebleTexto = item.aveInmuebleName || '-';
                var identificacionTexto = (item.tipoIdentificacion ? item.tipoIdentificacion + ' ' : '') + (item.identificacionCliente || '-');
                var numeroAve = item.numeroAve || '-';

                html += '<tr>';
                html += '<td style="text-align:center; font-weight:600;">' + (offset + idx + 1) + '</td>';
                html += '<td><strong>' + self.escape(numeroAve) + '</strong></td>';
                html += '<td>' + self.escape(item.nombreCliente || '-') + '</td>';
                html += '<td>' + self.escape(identificacionTexto) + '</td>';
                html += '<td>' + self.escape(inmuebleTexto) + '</td>';
                html += '<td>' + self.escape(item.assignedUserName || '-') + '</td>';
                html += '<td>' + fecha + '</td>';
                html += '<td style="text-align:center;">';
                html += '<button class="ave-btn ave-btn-primary ave-btn-sm" data-action="ver-ave" data-id="' + item.id + '">';
                html += '<i class="fas fa-eye"></i> Ver</button>';
                html += '</td>';
                html += '</tr>';
            });

            $tbody.html(html);
            console.log('Tabla renderizada con', this.datos.length, 'filas');
        },

        renderizarPaginacion: function () {
            console.log('renderizarPaginacion() - Total páginas:', this.totalPaginas);
            
            if (this.totalPaginas <= 1) {
                this.$el.find('#ave-paginacion').hide();
                return;
            }

            this.$el.find('#ave-paginacion').show();
            
            var inicio = (this.pagina - 1) * this.porPagina + 1;
            var fin = Math.min(this.pagina * this.porPagina, this.totalRegistros);
            this.$el.find('#ave-page-info').text('Mostrando ' + inicio + '-' + fin + ' de ' + this.totalRegistros);

            var self = this;
            var $ctrl = this.$el.find('#ave-pag-controles');
            var html = '';

            html += '<button class="ave-pag-btn ' + (this.pagina === 1 ? 'disabled' : '') + '" data-pagina="' + (this.pagina - 1) + '"' + (this.pagina === 1 ? ' disabled' : '') + '>';
            html += '<i class="fas fa-chevron-left"></i></button>';

            var inicioPag = Math.max(1, this.pagina - 2);
            var finPag = Math.min(this.totalPaginas, this.pagina + 2);
            
            if (inicioPag > 1) {
                html += '<button class="ave-pag-btn" data-pagina="1">1</button>';
                if (inicioPag > 2) html += '<span class="pag-ellipsis" style="padding: 0 4px;">…</span>';
            }
            
            for (var i = inicioPag; i <= finPag; i++) {
                html += '<button class="ave-pag-btn ' + (i === this.pagina ? 'active' : '') + '" data-pagina="' + i + '">' + i + '</button>';
            }
            
            if (finPag < this.totalPaginas) {
                if (finPag < this.totalPaginas - 1) html += '<span class="pag-ellipsis" style="padding: 0 4px;">…</span>';
                html += '<button class="ave-pag-btn" data-pagina="' + this.totalPaginas + '">' + this.totalPaginas + '</button>';
            }

            html += '<button class="ave-pag-btn ' + (this.pagina === this.totalPaginas ? 'disabled' : '') + '" data-pagina="' + (this.pagina + 1) + '"' + (this.pagina === this.totalPaginas ? ' disabled' : '') + '>';
            html += '<i class="fas fa-chevron-right"></i></button>';

            $ctrl.html(html);
        },

        crearNuevo: function () {
            console.log('crearNuevo() - Creando nuevo AVE');
            var self = this;
            Espo.Ajax.postRequest('AvePrincipal', { name: 'Nuevo AVE' })
                .then(function (response) {
                    console.log('Respuesta creación:', response);
                    if (response && response.id) {
                        self.getRouter().navigate('#AvePrincipal/view/' + response.id, { trigger: true });
                    } else {
                        Espo.Ui.error('No se pudo crear el avalúo');
                    }
                })
                .catch(function (error) {
                    console.error('Error creando AVE:', error);
                    Espo.Ui.error('Error al crear el avalúo');
                });
        },

        verAve: function (id) {
            console.log('verAve() - Navegando a detalle, ID:', id);
            if (id) {
                this.getRouter().navigate('#AvePrincipal/view/' + id, { trigger: true });
            } else {
                Espo.Ui.error('ID de avalúo no válido');
            }
        },

        limpiarFiltros: function () {
            console.log('limpiarFiltros()');
            this.$el.find('#filtro-numero').val('');
            this.$el.find('#filtro-cliente').val('');
            this.$el.find('#filtro-identificacion').val('');
            this.$el.find('#filtro-asesor').val('');
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