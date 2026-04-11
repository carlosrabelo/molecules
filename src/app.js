import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { PDBLoader } from 'three/addons/loaders/PDBLoader.js';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/addons/renderers/CSS3DRenderer.js';
import { GUI } from 'lil-gui';

// ── Nomes dos elementos para a legenda ───────────────────────────
const NOME_ELEMENTO = {
	H: 'Hidrogênio',
	C: 'Carbono',
	N: 'Nitrogênio',
	O: 'Oxigênio',
	F: 'Flúor',
	Na: 'Sódio',
	Al: 'Alumínio',
	Cl: 'Cloro',
	Ca: 'Cálcio',
	Cu: 'Cobre',
	Y: 'Ítrio',
	Ba: 'Bário',
};

const SUBSCRITOS = {
	'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
	'₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

// Preenchidos por carregarCatalogo() a partir de molecules.json
let COR_CATEGORIA = {};
let INFO_MOLECULA = {};
let LISTA_MOLECULAS = [];
let MOLECULAS = {};

const TIPO_VISUALIZACAO = { 'Átomos': 0, 'Ligações': 1, 'Átomos + Ligações': 2 };
let indiceMolecula = 0;

// ── Constantes de escala molecular ───────────────────────────────
const ESCALA_MOLECULAR = 75;    // fator de escala para posição dos átomos/ligações
const COMPENSAR_ATOMOS = 50;    // px descontados para não sobrepor os átomos nas pontas
const EXTENSAO_LIGACAO = 55;    // px adicionados para a ligação atingir o centro dos átomos
const PASSO_ORDEM = 9;          // px entre traços paralelos de uma ligação múltipla
const LIMIAR_ANEL = 1.49;       // Å; acima disto a ligação é simples e não entra num anel conjugado

// Distâncias em Å, medidas nestes PDB: dupla conjugada chega a 1,383;
// aromática isolada começa em 1,389; simples saturada fica acima de 1,50.
const CORTES_ORDEM = {
	'C-C': { tripla: 1.22, dupla: 1.386, aromatica: 1.445 },
	'C-N': { tripla: 1.20, dupla: 1.29,  aromatica: 1.42 },
	'C-O': { tripla: 1.15, dupla: 1.30 },
	'N-N': { tripla: 1.15, dupla: 1.25,  aromatica: 1.38 },
	'N-O': { tripla: 1.15, dupla: 1.22,  aromatica: 1.30 },
	'C-S': { tripla: 1.50, dupla: 1.65,  aromatica: 1.78 },
};
const ELEMENTOS_COVALENTES = new Set( [ 'C', 'N', 'O', 'S' ] );

// Velocidades angulares (rad/s)
const VELOCIDADE_ROTACAO_AUTO_X = 0.4;
const VELOCIDADE_ROTACAO_AUTO_Y = 0.28;
const VELOCIDADE_ROTACAO = 1.8;

// ── Estado ────────────────────────────────────────────────────────
let camera, scene, renderer, controls;
let root;
let controladorMolecula;
let controladorRotacao;
let pedidoCarga = 0;

const objetos = [];
let resumoLigacoes = { dupla: 0, tripla: 0, aromatica: 0 };
let atomoApontado = null;
const teclasPressionadas = new Set();
const VELOCIDADE_ZOOM = 1200; // unidades da cena por segundo
let ultimoTempo = Date.now();

const vecTemp1 = new THREE.Vector3();
const vecTemp2 = new THREE.Vector3();
const vecTemp3 = new THREE.Vector3();
const vecTemp4 = new THREE.Vector3();
const deslocamento = new THREE.Vector3();

const parametros = {
	tipoVisualizacao: 2,
	molecula: 'caffeine.pdb',
	mostrarRotulos: false,
	rotacionando: false,
	velocidade: 1.0,
};

const carregador = new PDBLoader();
const mapaSpriteCor = {};
const mapaCorElemento = {};
let spriteBase;

// ── Cache de elementos DOM ────────────────────────────────────────
const domInfoName        = document.getElementById( 'info-name' );
const domInfoFormula     = document.getElementById( 'info-formula' );
const domInfoWeight      = document.getElementById( 'info-weight' );
const domInfoDescription = document.getElementById( 'info-description' );
const domInfoCuriosidade = document.getElementById( 'info-curiosidade' );
const domInfoStats       = document.getElementById( 'info-stats' );
const domInfoCategory    = document.getElementById( 'info-category' );
const domLegendItems     = document.getElementById( 'legend-items' );
const domLegendFocus     = document.getElementById( 'legend-focus' );
const domLoading         = document.getElementById( 'loading' );

// ── Inicializar ──────────────────────────────────────────────────
function inicializar() {

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
	camera.position.z = 1000;

	scene = new THREE.Scene();
	root = new THREE.Object3D();
	scene.add( root );

	renderer = new CSS3DRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById( 'container' ).appendChild( renderer.domElement );

	controls = new TrackballControls( camera, renderer.domElement );
	controls.rotateSpeed = 0.5;

	spriteBase = criarSpriteAtomo();

	window.addEventListener( 'resize', aoRedimensionarJanela );
	window.addEventListener( 'keydown', aoPressionarTecla );
	window.addEventListener( 'keyup', e => teclasPressionadas.delete( e.key ) );

	carregarCatalogo();

}

async function carregarCatalogo() {

	try {

		const resposta = await fetch( 'molecules.json' );
		if ( !resposta.ok ) throw new Error( resposta.statusText );
		aplicarCatalogo( await resposta.json() );

	} catch ( erro ) {

		console.error( erro );
		mostrarFalha( parametros.molecula, 'Não foi possível carregar o catálogo de moléculas.' );
		return;

	}

	const gui = new GUI( { title: 'Controles' } );
	gui.add( parametros, 'tipoVisualizacao', TIPO_VISUALIZACAO ).name( 'Visualização' ).onChange( aplicarVisualizacao );
	controladorMolecula = gui.add( parametros, 'molecula', MOLECULAS ).name( 'Molécula' ).onChange( m => {
		indiceMolecula = LISTA_MOLECULAS.findIndex( ( [ , f ] ) => f === m );
		carregarMolecula( m );
	} );
	gui.add( parametros, 'mostrarRotulos' ).name( 'Símbolos nos átomos' ).onChange( alternarRotulos );
	controladorRotacao = gui.add( parametros, 'rotacionando' ).name( 'Rotação automática' );
	gui.add( parametros, 'velocidade', 0.1, 3.0, 0.1 ).name( 'Velocidade' );

	carregarMolecula( parametros.molecula );

}

function aplicarCatalogo( catalogo ) {

	COR_CATEGORIA = catalogo.categorias || {};
	LISTA_MOLECULAS = ( catalogo.moleculas || [] ).map( m => [ m.nome, m.arquivo ] );
	MOLECULAS = Object.fromEntries( LISTA_MOLECULAS );
	INFO_MOLECULA = Object.fromEntries( ( catalogo.moleculas || [] ).map( m => [ m.arquivo, m ] ) );

	const daUrl = arquivoDaUrl();
	const indiceCafeina = LISTA_MOLECULAS.findIndex( ( [ , arquivo ] ) => arquivo === 'caffeine.pdb' );
	indiceMolecula = daUrl
		? LISTA_MOLECULAS.findIndex( ( [ , arquivo ] ) => arquivo === daUrl )
		: ( indiceCafeina >= 0 ? indiceCafeina : 0 );
	parametros.molecula = LISTA_MOLECULAS[ indiceMolecula ]?.[ 1 ] || parametros.molecula;

}

// ── Teclado ───────────────────────────────────────────────────────
function aoPressionarTecla( e ) {
	teclasPressionadas.add( e.key );

	if ( [ 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', '[', ']' ].includes( e.key ) ) {
		e.preventDefault();
	}

	switch ( e.key ) {
		case ' ':
			parametros.rotacionando = !parametros.rotacionando;
			controladorRotacao?.updateDisplay();
			break;
		case 'r': case 'R':
			root.rotation.set( 0, 0, 0 );
			camera.position.set( 0, 0, 1000 );
			controls.reset();
			break;
		case 'f': case 'F':
			if ( !document.fullscreenElement ) document.documentElement.requestFullscreen();
			else document.exitFullscreen();
			break;
		case '[':
			navegarMolecula( -1 );
			break;
		case ']':
			navegarMolecula( +1 );
			break;
	}
}

function navegarMolecula( direcao ) {
	if ( LISTA_MOLECULAS.length === 0 ) return;
	indiceMolecula = ( indiceMolecula + direcao + LISTA_MOLECULAS.length ) % LISTA_MOLECULAS.length;
	const [ , arquivo ] = LISTA_MOLECULAS[ indiceMolecula ];
	parametros.molecula = arquivo;
	controladorMolecula.updateDisplay();
	carregarMolecula( arquivo );
}

// ── Visualização ──────────────────────────────────────────────────
function aplicarVisualizacao( modo ) {
	for ( const o of objetos ) {
		const ehAtomo = o instanceof CSS3DSprite;
		if ( modo === 0 ) {
			o.element.style.display = ehAtomo ? '' : 'none';
			o.visible = ehAtomo;
		} else if ( modo === 1 ) {
			o.element.style.display = ehAtomo ? 'none' : '';
			o.visible = !ehAtomo;
			if ( !ehAtomo ) o.element.style.height = o.userData.tamanhoLigacaoCompleto;
		} else {
			o.element.style.display = '';
			o.visible = true;
			if ( !ehAtomo ) o.element.style.height = o.userData.tamanhoLigacaoCurto;
		}
	}
}

// ── Labels ────────────────────────────────────────────────────────
function alternarRotulos( mostrar ) {
	document.querySelectorAll( '.atom-label' ).forEach( el => {
		el.style.display = mostrar ? 'block' : 'none';
	} );
}

// ── Sprites ───────────────────────────────────────────────────────
function criarSpriteAtomo() {

	const tamanho = 64;
	const canvas = document.createElement( 'canvas' );
	canvas.width = tamanho;
	canvas.height = tamanho;

	const contexto = canvas.getContext( '2d' );
	const gradiente = contexto.createRadialGradient( 26, 22, 2, 32, 32, 30 );
	gradiente.addColorStop( 0, 'rgba(255,255,255,1)' );
	gradiente.addColorStop( 0.45, 'rgba(255,255,255,0.95)' );
	gradiente.addColorStop( 0.75, 'rgba(255,255,255,0.55)' );
	gradiente.addColorStop( 1, 'rgba(255,255,255,0)' );
	contexto.fillStyle = gradiente;
	contexto.fillRect( 0, 0, tamanho, tamanho );

	return canvas;

}

function colorir( contexto, largura, altura, cor ) {
	const dadosImagem = contexto.getImageData( 0, 0, largura, altura );
	const dados = dadosImagem.data;
	for ( let i = 0; i < dados.length; i += 4 ) {
		dados[ i ]     *= cor.r;
		dados[ i + 1 ] *= cor.g;
		dados[ i + 2 ] *= cor.b;
	}
	contexto.putImageData( dadosImagem, 0, 0 );
}

function imagemParaCanvas( imagem ) {
	const canvas = document.createElement( 'canvas' );
	canvas.width = imagem.width;
	canvas.height = imagem.height;
	canvas.getContext( '2d' ).drawImage( imagem, 0, 0 );
	return canvas;
}

function obterSpriteColorido( elemento, cor ) {
	if ( !mapaSpriteCor[ elemento ] ) {
		const canvas = imagemParaCanvas( spriteBase );
		colorir( canvas.getContext( '2d' ), canvas.width, canvas.height, cor );
		mapaSpriteCor[ elemento ] = canvas.toDataURL();
		mapaCorElemento[ elemento ] = `rgb(${Math.round(cor.r*255)},${Math.round(cor.g*255)},${Math.round(cor.b*255)})`;
	}
	return mapaSpriteCor[ elemento ];
}

// ── Limpar objetos ────────────────────────────────────────────────
function limparObjetos() {
	soltarAtomo();
	for ( const o of objetos ) o.parent && o.parent.remove( o );
	objetos.length = 0;
}

function arquivoDaUrl() {

	const pedido = new URLSearchParams( window.location.search ).get( 'mol' );
	if ( !pedido ) return null;
	const comExtensao = /\.pdb$/i.test( pedido ) ? pedido : `${pedido}.pdb`;
	const achado = LISTA_MOLECULAS.find( ( [ , arquivo ] ) => arquivo.toLowerCase() === comExtensao.toLowerCase() );
	return achado ? achado[ 1 ] : null;

}

function apontarAtomo( wrapper, elemento ) {

	if ( atomoApontado && atomoApontado !== wrapper ) atomoApontado.classList.remove( 'apontado' );
	atomoApontado = wrapper;
	wrapper.classList.add( 'apontado' );
	domLegendFocus.hidden = false;
	domLegendFocus.textContent = NOME_ELEMENTO[ elemento ] ? `${elemento} ${NOME_ELEMENTO[ elemento ]}` : elemento;

}

function soltarAtomo() {

	if ( atomoApontado ) atomoApontado.classList.remove( 'apontado' );
	atomoApontado = null;
	if ( !domLegendFocus ) return;
	domLegendFocus.hidden = true;
	domLegendFocus.textContent = '';

}

// ── Carregar molécula ─────────────────────────────────────────────
function carregarMolecula( modelo ) {
	const pedido = ++pedidoCarga;
	limparObjetos();
	domLoading.classList.remove( 'hidden' );
	carregador.load( 'models/pdb/' + modelo, pdb => {
		if ( pedido !== pedidoCarga ) return;
		construirMolecula( pdb );
		aplicarVisualizacao( parametros.tipoVisualizacao );
		atualizarPainelInfo( modelo, pdb );
		atualizarLegenda( pdb );
		conferirFormula( modelo, pdb );
		domLoading.classList.add( 'hidden' );
	}, undefined, () => {
		if ( pedido !== pedidoCarga ) return;
		mostrarFalha( modelo, 'Não foi possível carregar o arquivo desta molécula.' );
	} );
}

// ── Construir molécula ────────────────────────────────────────────
function centralizarGeometria( geometryAtoms, geometryBonds ) {
	geometryAtoms.computeBoundingBox();
	geometryAtoms.boundingBox.getCenter( deslocamento ).negate();
	geometryAtoms.translate( deslocamento.x, deslocamento.y, deslocamento.z );
	geometryBonds.translate( deslocamento.x, deslocamento.y, deslocamento.z );
}

function construirAtomos( geometryAtoms, json ) {
	const posAtomos = geometryAtoms.getAttribute( 'position' );
	const corAtomos = geometryAtoms.getAttribute( 'color' );
	const posicao = new THREE.Vector3();
	const cor = new THREE.Color();

	for ( let i = 0; i < posAtomos.count; i++ ) {

		posicao.fromBufferAttribute( posAtomos, i );
		cor.fromBufferAttribute( corAtomos, i );

		const elemento = json.atoms[ i ][ 4 ];
		const sprite = obterSpriteColorido( elemento, cor );

		const wrapper = document.createElement( 'div' );
		wrapper.className = 'atom-wrap';

		const imagem = document.createElement( 'img' );
		imagem.src = sprite;

		const rotulo = document.createElement( 'span' );
		rotulo.className = 'atom-label';
		rotulo.textContent = elemento;
		rotulo.style.display = parametros.mostrarRotulos ? 'block' : 'none';

		wrapper.appendChild( imagem );
		wrapper.appendChild( rotulo );
		wrapper.addEventListener( 'pointerenter', () => apontarAtomo( wrapper, elemento ) );
		wrapper.addEventListener( 'pointerleave', () => {
			if ( atomoApontado === wrapper ) soltarAtomo();
		} );

		const objeto = new CSS3DSprite( wrapper );
		objeto.position.copy( posicao ).multiplyScalar( ESCALA_MOLECULAR );
		objeto.matrixAutoUpdate = false;
		objeto.updateMatrix();

		root.add( objeto );
		objetos.push( objeto );

	}
}

function indiceDoAtomo( vetor, posicoes ) {

	for ( let i = 0; i < posicoes.length; i++ ) {

		const dx = posicoes[ i ].x - vetor.x;
		const dy = posicoes[ i ].y - vetor.y;
		const dz = posicoes[ i ].z - vetor.z;
		if ( dx * dx + dy * dy + dz * dz < 1e-8 ) return i;

	}

	return -1;

}

function emAnelConjugado( a, b, grafo ) {

	const profundidade = new Map( [ [ a, 0 ] ] );
	const fila = [ a ];

	while ( fila.length ) {

		const no = fila.shift();
		const distancia = profundidade.get( no );
		if ( distancia >= 6 ) continue;

		for ( const vizinho of grafo[ no ] ) {

			if ( ( no === a && vizinho === b ) || ( no === b && vizinho === a ) ) continue;
			if ( profundidade.has( vizinho ) ) continue;

			const proxima = distancia + 1;
			if ( vizinho === b ) {

				if ( proxima >= 4 && proxima <= 6 ) return true;
				continue;

			}

			profundidade.set( vizinho, proxima );
			fila.push( vizinho );

		}

	}

	return false;

}

function classificarOrdem( elementoA, elementoB, angstrom, indiceA, indiceB, grafo ) {

	if ( !ELEMENTOS_COVALENTES.has( elementoA ) || !ELEMENTOS_COVALENTES.has( elementoB ) ) return 'simples';

	const cortes = CORTES_ORDEM[ [ elementoA, elementoB ].sort().join( '-' ) ];
	if ( !cortes ) return 'simples';
	if ( angstrom < cortes.tripla ) return 'tripla';
	if ( angstrom < LIMIAR_ANEL && indiceA >= 0 && indiceB >= 0 && emAnelConjugado( indiceA, indiceB, grafo ) ) return 'aromatica';
	if ( angstrom < cortes.dupla ) return 'dupla';
	if ( cortes.aromatica && angstrom < cortes.aromatica ) return 'aromatica';

	return 'simples';

}

function tracosDaOrdem( ordem ) {

	if ( ordem === 'dupla' ) return [
		[ 'bond bond-paralela', -PASSO_ORDEM / 2 ],
		[ 'bond bond-paralela',  PASSO_ORDEM / 2 ],
	];
	if ( ordem === 'tripla' ) return [
		[ 'bond bond-paralela', -PASSO_ORDEM ],
		[ 'bond bond-paralela',  0 ],
		[ 'bond bond-paralela',  PASSO_ORDEM ],
	];
	if ( ordem === 'aromatica' ) return [
		[ 'bond bond-paralela',   -PASSO_ORDEM / 2 ],
		[ 'bond bond-aromatica',   PASSO_ORDEM / 2 ],
	];

	return [ [ 'bond', 0 ] ];

}

function construirLigacoes( geometryAtoms, geometryBonds, json ) {

	const posAtomos = geometryAtoms.getAttribute( 'position' );
	const posLigacoes = geometryBonds.getAttribute( 'position' );
	const posicoes = [];
	const elementos = [];

	for ( let i = 0; i < posAtomos.count; i++ ) {

		posicoes.push( new THREE.Vector3().fromBufferAttribute( posAtomos, i ) );
		elementos.push( json.atoms[ i ][ 4 ] );

	}

	const registros = [];
	const inicio = new THREE.Vector3();
	const fim = new THREE.Vector3();

	for ( let i = 0; i < posLigacoes.count; i += 2 ) {

		inicio.fromBufferAttribute( posLigacoes, i );
		fim.fromBufferAttribute( posLigacoes, i + 1 );
		const indiceA = indiceDoAtomo( inicio, posicoes );
		const indiceB = indiceDoAtomo( fim, posicoes );
		registros.push( {
			indiceA, indiceB,
			elementoA: indiceA >= 0 ? elementos[ indiceA ] : '',
			elementoB: indiceB >= 0 ? elementos[ indiceB ] : '',
			angstrom: inicio.distanceTo( fim ),
			ax: inicio.x, ay: inicio.y, az: inicio.z,
			bx: fim.x, by: fim.y, bz: fim.z,
		} );

	}

	const grafo = Array.from( { length: elementos.length }, () => [] );
	for ( const registro of registros ) {

		if ( registro.indiceA < 0 || registro.indiceB < 0 ) continue;
		if ( registro.angstrom >= LIMIAR_ANEL ) continue;
		if ( !ELEMENTOS_COVALENTES.has( registro.elementoA ) || !ELEMENTOS_COVALENTES.has( registro.elementoB ) ) continue;
		grafo[ registro.indiceA ].push( registro.indiceB );
		grafo[ registro.indiceB ].push( registro.indiceA );

	}

	resumoLigacoes = { dupla: 0, tripla: 0, aromatica: 0 };

	const quatLigacao = new THREE.Quaternion();
	const quatCruzado = new THREE.Quaternion();
	const giroPerfil = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
	const lateral = new THREE.Vector3();
	const meio = new THREE.Vector3();
	const eixoY = new THREE.Vector3( 0, 1, 0 );

	for ( const registro of registros ) {

		inicio.set( registro.ax, registro.ay, registro.az ).multiplyScalar( ESCALA_MOLECULAR );
		fim.set( registro.bx, registro.by, registro.bz ).multiplyScalar( ESCALA_MOLECULAR );

		vecTemp1.subVectors( fim, inicio );
		const comprimento = vecTemp1.length();
		if ( comprimento < 1e-4 ) continue;

		const ordem = classificarOrdem( registro.elementoA, registro.elementoB, registro.angstrom, registro.indiceA, registro.indiceB, grafo );
		if ( ordem !== 'simples' ) resumoLigacoes[ ordem ]++;

		const tamanhoLigacao = Math.max( 8, comprimento - COMPENSAR_ATOMOS );
		const tamanhoLigacaoCurto = tamanhoLigacao + 'px';
		const tamanhoLigacaoCompleto = ( tamanhoLigacao + EXTENSAO_LIGACAO ) + 'px';

		vecTemp1.multiplyScalar( 1 / comprimento );
		quatLigacao.setFromUnitVectors( eixoY, vecTemp1 );
		lateral.set( 1, 0, 0 ).applyQuaternion( quatLigacao );

		quatCruzado.copy( quatLigacao ).multiply( giroPerfil );

		for ( const [ classe, desloc ] of tracosDaOrdem( ordem ) ) {

			meio.copy( inicio ).lerp( fim, 0.5 ).addScaledVector( lateral, desloc );
			adicionarTraco( classe, meio, quatLigacao, tamanhoLigacaoCurto, tamanhoLigacaoCompleto );
			adicionarTraco( classe, meio, quatCruzado, tamanhoLigacaoCurto, tamanhoLigacaoCompleto );

		}

	}

}

function adicionarTraco( classe, posicao, quaternion, alturaCurta, alturaCompleta ) {

	const traco = document.createElement( 'div' );
	traco.className = classe;
	traco.style.height = alturaCurta;

	const objeto = new CSS3DObject( traco );
	objeto.position.copy( posicao );
	objeto.quaternion.copy( quaternion );
	objeto.userData.tamanhoLigacaoCurto = alturaCurta;
	objeto.userData.tamanhoLigacaoCompleto = alturaCompleta;
	objeto.matrixAutoUpdate = false;
	objeto.updateMatrix();
	root.add( objeto );
	objetos.push( objeto );

}

function construirMolecula( pdb ) {
	const { geometryAtoms, geometryBonds, json } = pdb;
	centralizarGeometria( geometryAtoms, geometryBonds );
	construirAtomos( geometryAtoms, json );
	construirLigacoes( geometryAtoms, geometryBonds, json );
}

// ── Painel de informações ─────────────────────────────────────────
function preencherPainel( informacao ) {
	domInfoName.childNodes[ 0 ].textContent = ( informacao.nome || '—' ) + ' ';
	domInfoFormula.textContent              = informacao.formula || '—';
	domInfoWeight.textContent               = informacao.peso || '—';
	domInfoDescription.textContent          = informacao.descricao || '—';
	domInfoCuriosidade.textContent          = informacao.curiosidade ? '💡 ' + informacao.curiosidade : '';
	domInfoCuriosidade.style.display        = informacao.curiosidade ? '' : 'none';
	domInfoCategory.textContent             = informacao.categoria || '';
	domInfoCategory.style.background        = COR_CATEGORIA[ informacao.categoria ] || '#555';
}

function atualizarPainelInfo( modelo, pdb ) {
	const informacao = INFO_MOLECULA[ modelo ] || {
		nome: modelo, formula: '—', peso: '—', categoria: '',
		descricao: '—', curiosidade: '',
	};
	const contadorAtomos   = pdb.geometryAtoms.getAttribute( 'position' ).count;
	const contadorLigacoes = pdb.geometryBonds.getAttribute( 'position' ).count / 2;

	preencherPainel( informacao );
	domInfoStats.textContent = textoEstatisticas( contadorAtomos, contadorLigacoes );
}

function textoEstatisticas( contadorAtomos, contadorLigacoes ) {

	const partes = [ `${contadorAtomos} átomos`, `${contadorLigacoes} ligações` ];
	if ( resumoLigacoes.dupla ) partes.push( quantidade( resumoLigacoes.dupla, 'dupla', 'duplas' ) );
	if ( resumoLigacoes.tripla ) partes.push( quantidade( resumoLigacoes.tripla, 'tripla', 'triplas' ) );
	if ( resumoLigacoes.aromatica ) partes.push( quantidade( resumoLigacoes.aromatica, 'aromática', 'aromáticas' ) );

	return partes.join( ' · ' );

}

function quantidade( numero, singular, plural ) {

	return `${numero} ${numero === 1 ? singular : plural}`;

}

function contarFormula( formula ) {

	const texto = String( formula ).replace( /[₀-₉]/g, digito => SUBSCRITOS[ digito ] );
	const contagem = {};

	for ( const correspondencia of texto.matchAll( /([A-Z][a-z]?)(\d*)/g ) ) {

		const elemento = correspondencia[ 1 ];
		const quantidade = correspondencia[ 2 ] ? Number( correspondencia[ 2 ] ) : 1;
		contagem[ elemento ] = ( contagem[ elemento ] || 0 ) + quantidade;

	}

	return contagem;

}

function mdc( a, b ) {

	a = Math.abs( a );
	b = Math.abs( b );
	while ( b ) {

		const resto = a % b;
		a = b;
		b = resto;

	}
	return a;

}

function reduzirContagem( contagem ) {

	const divisor = Object.values( contagem ).reduce( ( acumulado, quantidade ) => mdc( acumulado, quantidade ), 0 ) || 1;
	const reduzida = {};
	for ( const [ elemento, quantidade ] of Object.entries( contagem ) ) {

		reduzida[ elemento ] = quantidade / divisor;

	}
	return reduzida;

}

function contagensIguais( a, b ) {

	const chaves = new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] );
	for ( const chave of chaves ) {

		if ( ( a[ chave ] || 0 ) !== ( b[ chave ] || 0 ) ) return false;

	}
	return true;

}

function conferirFormula( modelo, pdb ) {

	const informacao = INFO_MOLECULA[ modelo ];
	if ( !informacao?.formula ) return;

	const dosAtomos = {};
	for ( const atomo of pdb.json.atoms ) {

		const elemento = atomo[ 4 ];
		dosAtomos[ elemento ] = ( dosAtomos[ elemento ] || 0 ) + 1;

	}

	const cadastrada = reduzirContagem( contarFormula( informacao.formula ) );
	const observada = reduzirContagem( dosAtomos );
	if ( contagensIguais( cadastrada, observada ) ) return;

	console.warn(
		`A fórmula cadastrada de ${informacao.nome} (${informacao.formula}) não corresponde à proporção dos átomos em ${modelo}.`,
		{ formula: contarFormula( informacao.formula ), arquivo: dosAtomos },
	);

}

function mostrarFalha( modelo, mensagem ) {
	domLoading.classList.add( 'hidden' );
	const informacao = INFO_MOLECULA[ modelo ] || { nome: modelo };
	preencherPainel( { ...informacao, descricao: mensagem, curiosidade: '' } );
	domInfoStats.textContent = '';
	domLegendItems.innerHTML = '';
}

// ── Legenda de elementos ──────────────────────────────────────────
function atualizarLegenda( pdb ) {
	const elementos = new Set( pdb.json.atoms.map( a => a[ 4 ] ) );
	domLegendItems.innerHTML = '';
	for ( const el of elementos ) {
		const item = document.createElement( 'div' );
		item.className = 'legend-item';

		const ponto = document.createElement( 'div' );
		ponto.className = 'legend-dot';
		ponto.style.background = mapaCorElemento[ el ] || '#fff';

		const nome = document.createElement( 'span' );
		nome.textContent = NOME_ELEMENTO[ el ] ? `${el} ${NOME_ELEMENTO[ el ]}` : el;

		item.appendChild( ponto );
		item.appendChild( nome );
		domLegendItems.appendChild( item );
	}

	if ( resumoLigacoes.aromatica ) {

		const nota = document.createElement( 'div' );
		nota.className = 'legend-note';
		nota.textContent = 'tracejado = aromática';
		domLegendItems.appendChild( nota );

	}
}

// ── Resize ────────────────────────────────────────────────────────
function aoRedimensionarJanela() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

// ── Loop ──────────────────────────────────────────────────────────
function animar() {
	requestAnimationFrame( animar );
	controls.update();

	const agora = Date.now();
	const delta = ( agora - ultimoTempo ) / 1000;
	ultimoTempo = agora;

	if ( parametros.rotacionando ) {
		root.rotation.x += delta * VELOCIDADE_ROTACAO_AUTO_X * parametros.velocidade;
		root.rotation.y += delta * VELOCIDADE_ROTACAO_AUTO_Y * parametros.velocidade;
	}

	if ( teclasPressionadas.size > 0 ) {
		if ( teclasPressionadas.has( 'ArrowUp'    ) ) root.rotation.x -= delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( 'ArrowDown'  ) ) root.rotation.x += delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( 'ArrowLeft'  ) ) root.rotation.y -= delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( 'ArrowRight' ) ) root.rotation.y += delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( 'q' ) || teclasPressionadas.has( 'Q' ) ) root.rotation.z -= delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( 'e' ) || teclasPressionadas.has( 'E' ) ) root.rotation.z += delta * VELOCIDADE_ROTACAO;
		if ( teclasPressionadas.has( '+' ) || teclasPressionadas.has( '=' ) ) camera.position.z = Math.max(  200, camera.position.z - delta * VELOCIDADE_ZOOM );
		if ( teclasPressionadas.has( '-' ) || teclasPressionadas.has( '_' ) ) camera.position.z = Math.min( 3000, camera.position.z + delta * VELOCIDADE_ZOOM );
	}

	renderer.render( scene, camera );
}

inicializar();
animar();
