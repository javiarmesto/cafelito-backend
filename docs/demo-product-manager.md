# Cafelito · ensayo de alta de un café

## Preparación del mostrador
En el backend de ensayo, configurar BC_RELEASES_ENABLED=true, BC_TENANT_ID, BC_ENVIRONMENT=Capsula30, BC_COMPANY_ID (GUID de Capsula US), BC_CLIENT_ID, BC_CLIENT_SECRET y BC_BAG_250G_UOM (código real de la unidad base que representa una bolsa de 250 g). Usar las variables protegidas del alojamiento para el secreto. La aplicación Entra debe tener acceso S2S de lectura en Business Central a artículos y su imagen. Verificar que la divisa local de la empresa sea USD.

Preparar en BC la categoría de publicación CAFELITO. Usarla solo con referencias destinadas al mostrador. El filtro admite artículos de inventario desbloqueados, con precio positivo y la unidad base configurada. El precio mostrado es Unit Price en USD, con la indicación de impuestos de la ficha. La cantidad es inventario total en unidades base. La foto procede de la imagen del artículo. Un adjunto de documento no aparece como imagen.

Abrir la versión del frontend de ensayo con `?novedades=1#catalogue`. La lectura de `GET /api/catalog/releases` devuelve los artículos de la empresa configurada y una fecha de consulta. La caché del servidor dura diez segundos. Para comprobar un cambio, esperar ese intervalo y pulsar Actualizar. La sección no cursa pedidos. Para el ensayo, usar una foto propia de la bolsa.

## M365 Copilot · descubrir y comprobar
Adjunta la foto y pide: «Actúas como Product Manager de Cafelito. Transcribe los datos legibles de esta bolsa, conserva el idioma original y marca los dudosos. Separa marca, nombre comercial, origen, tueste, formato y GTIN. Usa mi plugin de BC para confirmar empresa y entorno, y busca coincidencias por GTIN y por nombre y formato. Devuélveme las referencias coincidentes y señala qué falta para crear el artículo». Si la acción de lectura de artículos no está disponible, mostrar esa limitación y habilitarla antes del directo.

## Business Skill · Preparar alta de café
Texto para la ficha de Business Skills de Copilot en BC:

> Trabaja en Capsula US. A partir de una foto propia, URL del proveedor o transcripción, presenta nombre comercial, formato, GTIN y solo los atributos legibles. Distingue los datos de la etiqueta de los datos internos. Verifica coincidencias en artículos por GTIN cuando exista y por descripción y formato. Si hay un candidato, presenta su número y espera la decisión antes de crear. Busca la plantilla de artículo de inventario acordada para café y la unidad base que representa una bolsa de 250 g. Pregunta por el precio de venta aprobado en USD, el tratamiento de impuestos y cualquier campo obligatorio que falte. Muestra una propuesta. Tras la confirmación, crea el artículo con los valores de la plantilla. Guarda nombre y resumen breve del origen o tueste confirmado en Description y Description 2. Si puedes importar la foto en la imagen del artículo, hazlo. Si hace falta una operación manual, guía al usuario a la ficha para importar la imagen y verifica el resultado. Una vez revisado el artículo, pide autorización para asignar la categoría CAFELITO y publicarlo. Devuelve número, nombre, precio unitario, unidad base, inventario y estado de imagen y publicación. No generes movimientos de inventario. Si se interrumpe el proceso, recupera el mismo artículo por número antes de continuar.

## Claude · comprobación independiente
«Usa mi plugin para consultar en Capsula30, empresa Capsula US, el artículo [número devuelto por BC]. Indícame nombre, categoría, precio unitario en USD, unidad base e inventario. Señala los campos que no puedas comprobar». Contrastar el mismo número en el mostrador. Una respuesta de texto sin llamada al plugin no acredita la lectura.

## Ensayo de aceptación
1. Consultar el número de referencia antes del alta y conservar el resultado.
2. Con una bolsa de 250 g, aprobar precio, fiscalidad y plantilla. Usar un artículo nuevo sin movimientos.
3. Abrir su ficha y comprobar la foto. Publicar asignando CAFELITO.
4. Actualizar el mostrador. Comparar número, foto, precio, unidad, impuestos y estado «Sin existencias» con BC.
5. Pedir la consulta en Claude. Repetir la propuesta de alta y comprobar que detecta la referencia existente.
6. Para retirar la referencia de ensayo, quitar la categoría de publicación y verificar tras actualizar.
