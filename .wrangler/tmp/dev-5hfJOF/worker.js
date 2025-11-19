var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-vHSBir/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-vHSBir/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// .wrangler/tmp/bundle-vHSBir/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-vHSBir/strip-cf-connecting-ip-header.js"() {
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// node_modules/@cloudflare/kv-asset-handler/node_modules/mime/Mime.js
var require_Mime = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/node_modules/mime/Mime.js"(exports, module) {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    function Mime() {
      this._types = /* @__PURE__ */ Object.create(null);
      this._extensions = /* @__PURE__ */ Object.create(null);
      for (let i2 = 0; i2 < arguments.length; i2++) {
        this.define(arguments[i2]);
      }
      this.define = this.define.bind(this);
      this.getType = this.getType.bind(this);
      this.getExtension = this.getExtension.bind(this);
    }
    __name(Mime, "Mime");
    Mime.prototype.define = function(typeMap, force) {
      for (let type in typeMap) {
        let extensions = typeMap[type].map(function(t) {
          return t.toLowerCase();
        });
        type = type.toLowerCase();
        for (let i2 = 0; i2 < extensions.length; i2++) {
          const ext = extensions[i2];
          if (ext[0] === "*") {
            continue;
          }
          if (!force && ext in this._types) {
            throw new Error(
              'Attempt to change mapping for "' + ext + '" extension from "' + this._types[ext] + '" to "' + type + '". Pass `force=true` to allow this, otherwise remove "' + ext + '" from the list of extensions for "' + type + '".'
            );
          }
          this._types[ext] = type;
        }
        if (force || !this._extensions[type]) {
          const ext = extensions[0];
          this._extensions[type] = ext[0] !== "*" ? ext : ext.substr(1);
        }
      }
    };
    Mime.prototype.getType = function(path) {
      path = String(path);
      let last = path.replace(/^.*[/\\]/, "").toLowerCase();
      let ext = last.replace(/^.*\./, "").toLowerCase();
      let hasPath = last.length < path.length;
      let hasDot = ext.length < last.length - 1;
      return (hasDot || !hasPath) && this._types[ext] || null;
    };
    Mime.prototype.getExtension = function(type) {
      type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
      return type && this._extensions[type.toLowerCase()] || null;
    };
    module.exports = Mime;
  }
});

// node_modules/@cloudflare/kv-asset-handler/node_modules/mime/types/standard.js
var require_standard = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/node_modules/mime/types/standard.js"(exports, module) {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    module.exports = { "application/andrew-inset": ["ez"], "application/applixware": ["aw"], "application/atom+xml": ["atom"], "application/atomcat+xml": ["atomcat"], "application/atomdeleted+xml": ["atomdeleted"], "application/atomsvc+xml": ["atomsvc"], "application/atsc-dwd+xml": ["dwd"], "application/atsc-held+xml": ["held"], "application/atsc-rsat+xml": ["rsat"], "application/bdoc": ["bdoc"], "application/calendar+xml": ["xcs"], "application/ccxml+xml": ["ccxml"], "application/cdfx+xml": ["cdfx"], "application/cdmi-capability": ["cdmia"], "application/cdmi-container": ["cdmic"], "application/cdmi-domain": ["cdmid"], "application/cdmi-object": ["cdmio"], "application/cdmi-queue": ["cdmiq"], "application/cu-seeme": ["cu"], "application/dash+xml": ["mpd"], "application/davmount+xml": ["davmount"], "application/docbook+xml": ["dbk"], "application/dssc+der": ["dssc"], "application/dssc+xml": ["xdssc"], "application/ecmascript": ["es", "ecma"], "application/emma+xml": ["emma"], "application/emotionml+xml": ["emotionml"], "application/epub+zip": ["epub"], "application/exi": ["exi"], "application/express": ["exp"], "application/fdt+xml": ["fdt"], "application/font-tdpfr": ["pfr"], "application/geo+json": ["geojson"], "application/gml+xml": ["gml"], "application/gpx+xml": ["gpx"], "application/gxf": ["gxf"], "application/gzip": ["gz"], "application/hjson": ["hjson"], "application/hyperstudio": ["stk"], "application/inkml+xml": ["ink", "inkml"], "application/ipfix": ["ipfix"], "application/its+xml": ["its"], "application/java-archive": ["jar", "war", "ear"], "application/java-serialized-object": ["ser"], "application/java-vm": ["class"], "application/javascript": ["js", "mjs"], "application/json": ["json", "map"], "application/json5": ["json5"], "application/jsonml+json": ["jsonml"], "application/ld+json": ["jsonld"], "application/lgr+xml": ["lgr"], "application/lost+xml": ["lostxml"], "application/mac-binhex40": ["hqx"], "application/mac-compactpro": ["cpt"], "application/mads+xml": ["mads"], "application/manifest+json": ["webmanifest"], "application/marc": ["mrc"], "application/marcxml+xml": ["mrcx"], "application/mathematica": ["ma", "nb", "mb"], "application/mathml+xml": ["mathml"], "application/mbox": ["mbox"], "application/mediaservercontrol+xml": ["mscml"], "application/metalink+xml": ["metalink"], "application/metalink4+xml": ["meta4"], "application/mets+xml": ["mets"], "application/mmt-aei+xml": ["maei"], "application/mmt-usd+xml": ["musd"], "application/mods+xml": ["mods"], "application/mp21": ["m21", "mp21"], "application/mp4": ["mp4s", "m4p"], "application/msword": ["doc", "dot"], "application/mxf": ["mxf"], "application/n-quads": ["nq"], "application/n-triples": ["nt"], "application/node": ["cjs"], "application/octet-stream": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"], "application/oda": ["oda"], "application/oebps-package+xml": ["opf"], "application/ogg": ["ogx"], "application/omdoc+xml": ["omdoc"], "application/onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"], "application/oxps": ["oxps"], "application/p2p-overlay+xml": ["relo"], "application/patch-ops-error+xml": ["xer"], "application/pdf": ["pdf"], "application/pgp-encrypted": ["pgp"], "application/pgp-signature": ["asc", "sig"], "application/pics-rules": ["prf"], "application/pkcs10": ["p10"], "application/pkcs7-mime": ["p7m", "p7c"], "application/pkcs7-signature": ["p7s"], "application/pkcs8": ["p8"], "application/pkix-attr-cert": ["ac"], "application/pkix-cert": ["cer"], "application/pkix-crl": ["crl"], "application/pkix-pkipath": ["pkipath"], "application/pkixcmp": ["pki"], "application/pls+xml": ["pls"], "application/postscript": ["ai", "eps", "ps"], "application/provenance+xml": ["provx"], "application/pskc+xml": ["pskcxml"], "application/raml+yaml": ["raml"], "application/rdf+xml": ["rdf", "owl"], "application/reginfo+xml": ["rif"], "application/relax-ng-compact-syntax": ["rnc"], "application/resource-lists+xml": ["rl"], "application/resource-lists-diff+xml": ["rld"], "application/rls-services+xml": ["rs"], "application/route-apd+xml": ["rapd"], "application/route-s-tsid+xml": ["sls"], "application/route-usd+xml": ["rusd"], "application/rpki-ghostbusters": ["gbr"], "application/rpki-manifest": ["mft"], "application/rpki-roa": ["roa"], "application/rsd+xml": ["rsd"], "application/rss+xml": ["rss"], "application/rtf": ["rtf"], "application/sbml+xml": ["sbml"], "application/scvp-cv-request": ["scq"], "application/scvp-cv-response": ["scs"], "application/scvp-vp-request": ["spq"], "application/scvp-vp-response": ["spp"], "application/sdp": ["sdp"], "application/senml+xml": ["senmlx"], "application/sensml+xml": ["sensmlx"], "application/set-payment-initiation": ["setpay"], "application/set-registration-initiation": ["setreg"], "application/shf+xml": ["shf"], "application/sieve": ["siv", "sieve"], "application/smil+xml": ["smi", "smil"], "application/sparql-query": ["rq"], "application/sparql-results+xml": ["srx"], "application/srgs": ["gram"], "application/srgs+xml": ["grxml"], "application/sru+xml": ["sru"], "application/ssdl+xml": ["ssdl"], "application/ssml+xml": ["ssml"], "application/swid+xml": ["swidtag"], "application/tei+xml": ["tei", "teicorpus"], "application/thraud+xml": ["tfi"], "application/timestamped-data": ["tsd"], "application/toml": ["toml"], "application/trig": ["trig"], "application/ttml+xml": ["ttml"], "application/ubjson": ["ubj"], "application/urc-ressheet+xml": ["rsheet"], "application/urc-targetdesc+xml": ["td"], "application/voicexml+xml": ["vxml"], "application/wasm": ["wasm"], "application/widget": ["wgt"], "application/winhlp": ["hlp"], "application/wsdl+xml": ["wsdl"], "application/wspolicy+xml": ["wspolicy"], "application/xaml+xml": ["xaml"], "application/xcap-att+xml": ["xav"], "application/xcap-caps+xml": ["xca"], "application/xcap-diff+xml": ["xdf"], "application/xcap-el+xml": ["xel"], "application/xcap-ns+xml": ["xns"], "application/xenc+xml": ["xenc"], "application/xhtml+xml": ["xhtml", "xht"], "application/xliff+xml": ["xlf"], "application/xml": ["xml", "xsl", "xsd", "rng"], "application/xml-dtd": ["dtd"], "application/xop+xml": ["xop"], "application/xproc+xml": ["xpl"], "application/xslt+xml": ["*xsl", "xslt"], "application/xspf+xml": ["xspf"], "application/xv+xml": ["mxml", "xhvml", "xvml", "xvm"], "application/yang": ["yang"], "application/yin+xml": ["yin"], "application/zip": ["zip"], "audio/3gpp": ["*3gpp"], "audio/adpcm": ["adp"], "audio/amr": ["amr"], "audio/basic": ["au", "snd"], "audio/midi": ["mid", "midi", "kar", "rmi"], "audio/mobile-xmf": ["mxmf"], "audio/mp3": ["*mp3"], "audio/mp4": ["m4a", "mp4a"], "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"], "audio/ogg": ["oga", "ogg", "spx", "opus"], "audio/s3m": ["s3m"], "audio/silk": ["sil"], "audio/wav": ["wav"], "audio/wave": ["*wav"], "audio/webm": ["weba"], "audio/xm": ["xm"], "font/collection": ["ttc"], "font/otf": ["otf"], "font/ttf": ["ttf"], "font/woff": ["woff"], "font/woff2": ["woff2"], "image/aces": ["exr"], "image/apng": ["apng"], "image/avif": ["avif"], "image/bmp": ["bmp"], "image/cgm": ["cgm"], "image/dicom-rle": ["drle"], "image/emf": ["emf"], "image/fits": ["fits"], "image/g3fax": ["g3"], "image/gif": ["gif"], "image/heic": ["heic"], "image/heic-sequence": ["heics"], "image/heif": ["heif"], "image/heif-sequence": ["heifs"], "image/hej2k": ["hej2"], "image/hsj2": ["hsj2"], "image/ief": ["ief"], "image/jls": ["jls"], "image/jp2": ["jp2", "jpg2"], "image/jpeg": ["jpeg", "jpg", "jpe"], "image/jph": ["jph"], "image/jphc": ["jhc"], "image/jpm": ["jpm"], "image/jpx": ["jpx", "jpf"], "image/jxr": ["jxr"], "image/jxra": ["jxra"], "image/jxrs": ["jxrs"], "image/jxs": ["jxs"], "image/jxsc": ["jxsc"], "image/jxsi": ["jxsi"], "image/jxss": ["jxss"], "image/ktx": ["ktx"], "image/ktx2": ["ktx2"], "image/png": ["png"], "image/sgi": ["sgi"], "image/svg+xml": ["svg", "svgz"], "image/t38": ["t38"], "image/tiff": ["tif", "tiff"], "image/tiff-fx": ["tfx"], "image/webp": ["webp"], "image/wmf": ["wmf"], "message/disposition-notification": ["disposition-notification"], "message/global": ["u8msg"], "message/global-delivery-status": ["u8dsn"], "message/global-disposition-notification": ["u8mdn"], "message/global-headers": ["u8hdr"], "message/rfc822": ["eml", "mime"], "model/3mf": ["3mf"], "model/gltf+json": ["gltf"], "model/gltf-binary": ["glb"], "model/iges": ["igs", "iges"], "model/mesh": ["msh", "mesh", "silo"], "model/mtl": ["mtl"], "model/obj": ["obj"], "model/step+xml": ["stpx"], "model/step+zip": ["stpz"], "model/step-xml+zip": ["stpxz"], "model/stl": ["stl"], "model/vrml": ["wrl", "vrml"], "model/x3d+binary": ["*x3db", "x3dbz"], "model/x3d+fastinfoset": ["x3db"], "model/x3d+vrml": ["*x3dv", "x3dvz"], "model/x3d+xml": ["x3d", "x3dz"], "model/x3d-vrml": ["x3dv"], "text/cache-manifest": ["appcache", "manifest"], "text/calendar": ["ics", "ifb"], "text/coffeescript": ["coffee", "litcoffee"], "text/css": ["css"], "text/csv": ["csv"], "text/html": ["html", "htm", "shtml"], "text/jade": ["jade"], "text/jsx": ["jsx"], "text/less": ["less"], "text/markdown": ["markdown", "md"], "text/mathml": ["mml"], "text/mdx": ["mdx"], "text/n3": ["n3"], "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"], "text/richtext": ["rtx"], "text/rtf": ["*rtf"], "text/sgml": ["sgml", "sgm"], "text/shex": ["shex"], "text/slim": ["slim", "slm"], "text/spdx": ["spdx"], "text/stylus": ["stylus", "styl"], "text/tab-separated-values": ["tsv"], "text/troff": ["t", "tr", "roff", "man", "me", "ms"], "text/turtle": ["ttl"], "text/uri-list": ["uri", "uris", "urls"], "text/vcard": ["vcard"], "text/vtt": ["vtt"], "text/xml": ["*xml"], "text/yaml": ["yaml", "yml"], "video/3gpp": ["3gp", "3gpp"], "video/3gpp2": ["3g2"], "video/h261": ["h261"], "video/h263": ["h263"], "video/h264": ["h264"], "video/iso.segment": ["m4s"], "video/jpeg": ["jpgv"], "video/jpm": ["*jpm", "jpgm"], "video/mj2": ["mj2", "mjp2"], "video/mp2t": ["ts"], "video/mp4": ["mp4", "mp4v", "mpg4"], "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"], "video/ogg": ["ogv"], "video/quicktime": ["qt", "mov"], "video/webm": ["webm"] };
  }
});

// node_modules/@cloudflare/kv-asset-handler/node_modules/mime/types/other.js
var require_other = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/node_modules/mime/types/other.js"(exports, module) {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    module.exports = { "application/prs.cww": ["cww"], "application/vnd.1000minds.decision-model+xml": ["1km"], "application/vnd.3gpp.pic-bw-large": ["plb"], "application/vnd.3gpp.pic-bw-small": ["psb"], "application/vnd.3gpp.pic-bw-var": ["pvb"], "application/vnd.3gpp2.tcap": ["tcap"], "application/vnd.3m.post-it-notes": ["pwn"], "application/vnd.accpac.simply.aso": ["aso"], "application/vnd.accpac.simply.imp": ["imp"], "application/vnd.acucobol": ["acu"], "application/vnd.acucorp": ["atc", "acutc"], "application/vnd.adobe.air-application-installer-package+zip": ["air"], "application/vnd.adobe.formscentral.fcdt": ["fcdt"], "application/vnd.adobe.fxp": ["fxp", "fxpl"], "application/vnd.adobe.xdp+xml": ["xdp"], "application/vnd.adobe.xfdf": ["xfdf"], "application/vnd.ahead.space": ["ahead"], "application/vnd.airzip.filesecure.azf": ["azf"], "application/vnd.airzip.filesecure.azs": ["azs"], "application/vnd.amazon.ebook": ["azw"], "application/vnd.americandynamics.acc": ["acc"], "application/vnd.amiga.ami": ["ami"], "application/vnd.android.package-archive": ["apk"], "application/vnd.anser-web-certificate-issue-initiation": ["cii"], "application/vnd.anser-web-funds-transfer-initiation": ["fti"], "application/vnd.antix.game-component": ["atx"], "application/vnd.apple.installer+xml": ["mpkg"], "application/vnd.apple.keynote": ["key"], "application/vnd.apple.mpegurl": ["m3u8"], "application/vnd.apple.numbers": ["numbers"], "application/vnd.apple.pages": ["pages"], "application/vnd.apple.pkpass": ["pkpass"], "application/vnd.aristanetworks.swi": ["swi"], "application/vnd.astraea-software.iota": ["iota"], "application/vnd.audiograph": ["aep"], "application/vnd.balsamiq.bmml+xml": ["bmml"], "application/vnd.blueice.multipass": ["mpm"], "application/vnd.bmi": ["bmi"], "application/vnd.businessobjects": ["rep"], "application/vnd.chemdraw+xml": ["cdxml"], "application/vnd.chipnuts.karaoke-mmd": ["mmd"], "application/vnd.cinderella": ["cdy"], "application/vnd.citationstyles.style+xml": ["csl"], "application/vnd.claymore": ["cla"], "application/vnd.cloanto.rp9": ["rp9"], "application/vnd.clonk.c4group": ["c4g", "c4d", "c4f", "c4p", "c4u"], "application/vnd.cluetrust.cartomobile-config": ["c11amc"], "application/vnd.cluetrust.cartomobile-config-pkg": ["c11amz"], "application/vnd.commonspace": ["csp"], "application/vnd.contact.cmsg": ["cdbcmsg"], "application/vnd.cosmocaller": ["cmc"], "application/vnd.crick.clicker": ["clkx"], "application/vnd.crick.clicker.keyboard": ["clkk"], "application/vnd.crick.clicker.palette": ["clkp"], "application/vnd.crick.clicker.template": ["clkt"], "application/vnd.crick.clicker.wordbank": ["clkw"], "application/vnd.criticaltools.wbs+xml": ["wbs"], "application/vnd.ctc-posml": ["pml"], "application/vnd.cups-ppd": ["ppd"], "application/vnd.curl.car": ["car"], "application/vnd.curl.pcurl": ["pcurl"], "application/vnd.dart": ["dart"], "application/vnd.data-vision.rdz": ["rdz"], "application/vnd.dbf": ["dbf"], "application/vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"], "application/vnd.dece.ttml+xml": ["uvt", "uvvt"], "application/vnd.dece.unspecified": ["uvx", "uvvx"], "application/vnd.dece.zip": ["uvz", "uvvz"], "application/vnd.denovo.fcselayout-link": ["fe_launch"], "application/vnd.dna": ["dna"], "application/vnd.dolby.mlp": ["mlp"], "application/vnd.dpgraph": ["dpg"], "application/vnd.dreamfactory": ["dfac"], "application/vnd.ds-keypoint": ["kpxx"], "application/vnd.dvb.ait": ["ait"], "application/vnd.dvb.service": ["svc"], "application/vnd.dynageo": ["geo"], "application/vnd.ecowin.chart": ["mag"], "application/vnd.enliven": ["nml"], "application/vnd.epson.esf": ["esf"], "application/vnd.epson.msf": ["msf"], "application/vnd.epson.quickanime": ["qam"], "application/vnd.epson.salt": ["slt"], "application/vnd.epson.ssf": ["ssf"], "application/vnd.eszigno3+xml": ["es3", "et3"], "application/vnd.ezpix-album": ["ez2"], "application/vnd.ezpix-package": ["ez3"], "application/vnd.fdf": ["fdf"], "application/vnd.fdsn.mseed": ["mseed"], "application/vnd.fdsn.seed": ["seed", "dataless"], "application/vnd.flographit": ["gph"], "application/vnd.fluxtime.clip": ["ftc"], "application/vnd.framemaker": ["fm", "frame", "maker", "book"], "application/vnd.frogans.fnc": ["fnc"], "application/vnd.frogans.ltf": ["ltf"], "application/vnd.fsc.weblaunch": ["fsc"], "application/vnd.fujitsu.oasys": ["oas"], "application/vnd.fujitsu.oasys2": ["oa2"], "application/vnd.fujitsu.oasys3": ["oa3"], "application/vnd.fujitsu.oasysgp": ["fg5"], "application/vnd.fujitsu.oasysprs": ["bh2"], "application/vnd.fujixerox.ddd": ["ddd"], "application/vnd.fujixerox.docuworks": ["xdw"], "application/vnd.fujixerox.docuworks.binder": ["xbd"], "application/vnd.fuzzysheet": ["fzs"], "application/vnd.genomatix.tuxedo": ["txd"], "application/vnd.geogebra.file": ["ggb"], "application/vnd.geogebra.tool": ["ggt"], "application/vnd.geometry-explorer": ["gex", "gre"], "application/vnd.geonext": ["gxt"], "application/vnd.geoplan": ["g2w"], "application/vnd.geospace": ["g3w"], "application/vnd.gmx": ["gmx"], "application/vnd.google-apps.document": ["gdoc"], "application/vnd.google-apps.presentation": ["gslides"], "application/vnd.google-apps.spreadsheet": ["gsheet"], "application/vnd.google-earth.kml+xml": ["kml"], "application/vnd.google-earth.kmz": ["kmz"], "application/vnd.grafeq": ["gqf", "gqs"], "application/vnd.groove-account": ["gac"], "application/vnd.groove-help": ["ghf"], "application/vnd.groove-identity-message": ["gim"], "application/vnd.groove-injector": ["grv"], "application/vnd.groove-tool-message": ["gtm"], "application/vnd.groove-tool-template": ["tpl"], "application/vnd.groove-vcard": ["vcg"], "application/vnd.hal+xml": ["hal"], "application/vnd.handheld-entertainment+xml": ["zmm"], "application/vnd.hbci": ["hbci"], "application/vnd.hhe.lesson-player": ["les"], "application/vnd.hp-hpgl": ["hpgl"], "application/vnd.hp-hpid": ["hpid"], "application/vnd.hp-hps": ["hps"], "application/vnd.hp-jlyt": ["jlt"], "application/vnd.hp-pcl": ["pcl"], "application/vnd.hp-pclxl": ["pclxl"], "application/vnd.hydrostatix.sof-data": ["sfd-hdstx"], "application/vnd.ibm.minipay": ["mpy"], "application/vnd.ibm.modcap": ["afp", "listafp", "list3820"], "application/vnd.ibm.rights-management": ["irm"], "application/vnd.ibm.secure-container": ["sc"], "application/vnd.iccprofile": ["icc", "icm"], "application/vnd.igloader": ["igl"], "application/vnd.immervision-ivp": ["ivp"], "application/vnd.immervision-ivu": ["ivu"], "application/vnd.insors.igm": ["igm"], "application/vnd.intercon.formnet": ["xpw", "xpx"], "application/vnd.intergeo": ["i2g"], "application/vnd.intu.qbo": ["qbo"], "application/vnd.intu.qfx": ["qfx"], "application/vnd.ipunplugged.rcprofile": ["rcprofile"], "application/vnd.irepository.package+xml": ["irp"], "application/vnd.is-xpr": ["xpr"], "application/vnd.isac.fcs": ["fcs"], "application/vnd.jam": ["jam"], "application/vnd.jcp.javame.midlet-rms": ["rms"], "application/vnd.jisp": ["jisp"], "application/vnd.joost.joda-archive": ["joda"], "application/vnd.kahootz": ["ktz", "ktr"], "application/vnd.kde.karbon": ["karbon"], "application/vnd.kde.kchart": ["chrt"], "application/vnd.kde.kformula": ["kfo"], "application/vnd.kde.kivio": ["flw"], "application/vnd.kde.kontour": ["kon"], "application/vnd.kde.kpresenter": ["kpr", "kpt"], "application/vnd.kde.kspread": ["ksp"], "application/vnd.kde.kword": ["kwd", "kwt"], "application/vnd.kenameaapp": ["htke"], "application/vnd.kidspiration": ["kia"], "application/vnd.kinar": ["kne", "knp"], "application/vnd.koan": ["skp", "skd", "skt", "skm"], "application/vnd.kodak-descriptor": ["sse"], "application/vnd.las.las+xml": ["lasxml"], "application/vnd.llamagraphics.life-balance.desktop": ["lbd"], "application/vnd.llamagraphics.life-balance.exchange+xml": ["lbe"], "application/vnd.lotus-1-2-3": ["123"], "application/vnd.lotus-approach": ["apr"], "application/vnd.lotus-freelance": ["pre"], "application/vnd.lotus-notes": ["nsf"], "application/vnd.lotus-organizer": ["org"], "application/vnd.lotus-screencam": ["scm"], "application/vnd.lotus-wordpro": ["lwp"], "application/vnd.macports.portpkg": ["portpkg"], "application/vnd.mapbox-vector-tile": ["mvt"], "application/vnd.mcd": ["mcd"], "application/vnd.medcalcdata": ["mc1"], "application/vnd.mediastation.cdkey": ["cdkey"], "application/vnd.mfer": ["mwf"], "application/vnd.mfmp": ["mfm"], "application/vnd.micrografx.flo": ["flo"], "application/vnd.micrografx.igx": ["igx"], "application/vnd.mif": ["mif"], "application/vnd.mobius.daf": ["daf"], "application/vnd.mobius.dis": ["dis"], "application/vnd.mobius.mbk": ["mbk"], "application/vnd.mobius.mqy": ["mqy"], "application/vnd.mobius.msl": ["msl"], "application/vnd.mobius.plc": ["plc"], "application/vnd.mobius.txf": ["txf"], "application/vnd.mophun.application": ["mpn"], "application/vnd.mophun.certificate": ["mpc"], "application/vnd.mozilla.xul+xml": ["xul"], "application/vnd.ms-artgalry": ["cil"], "application/vnd.ms-cab-compressed": ["cab"], "application/vnd.ms-excel": ["xls", "xlm", "xla", "xlc", "xlt", "xlw"], "application/vnd.ms-excel.addin.macroenabled.12": ["xlam"], "application/vnd.ms-excel.sheet.binary.macroenabled.12": ["xlsb"], "application/vnd.ms-excel.sheet.macroenabled.12": ["xlsm"], "application/vnd.ms-excel.template.macroenabled.12": ["xltm"], "application/vnd.ms-fontobject": ["eot"], "application/vnd.ms-htmlhelp": ["chm"], "application/vnd.ms-ims": ["ims"], "application/vnd.ms-lrm": ["lrm"], "application/vnd.ms-officetheme": ["thmx"], "application/vnd.ms-outlook": ["msg"], "application/vnd.ms-pki.seccat": ["cat"], "application/vnd.ms-pki.stl": ["*stl"], "application/vnd.ms-powerpoint": ["ppt", "pps", "pot"], "application/vnd.ms-powerpoint.addin.macroenabled.12": ["ppam"], "application/vnd.ms-powerpoint.presentation.macroenabled.12": ["pptm"], "application/vnd.ms-powerpoint.slide.macroenabled.12": ["sldm"], "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ["ppsm"], "application/vnd.ms-powerpoint.template.macroenabled.12": ["potm"], "application/vnd.ms-project": ["mpp", "mpt"], "application/vnd.ms-word.document.macroenabled.12": ["docm"], "application/vnd.ms-word.template.macroenabled.12": ["dotm"], "application/vnd.ms-works": ["wps", "wks", "wcm", "wdb"], "application/vnd.ms-wpl": ["wpl"], "application/vnd.ms-xpsdocument": ["xps"], "application/vnd.mseq": ["mseq"], "application/vnd.musician": ["mus"], "application/vnd.muvee.style": ["msty"], "application/vnd.mynfc": ["taglet"], "application/vnd.neurolanguage.nlu": ["nlu"], "application/vnd.nitf": ["ntf", "nitf"], "application/vnd.noblenet-directory": ["nnd"], "application/vnd.noblenet-sealer": ["nns"], "application/vnd.noblenet-web": ["nnw"], "application/vnd.nokia.n-gage.ac+xml": ["*ac"], "application/vnd.nokia.n-gage.data": ["ngdat"], "application/vnd.nokia.n-gage.symbian.install": ["n-gage"], "application/vnd.nokia.radio-preset": ["rpst"], "application/vnd.nokia.radio-presets": ["rpss"], "application/vnd.novadigm.edm": ["edm"], "application/vnd.novadigm.edx": ["edx"], "application/vnd.novadigm.ext": ["ext"], "application/vnd.oasis.opendocument.chart": ["odc"], "application/vnd.oasis.opendocument.chart-template": ["otc"], "application/vnd.oasis.opendocument.database": ["odb"], "application/vnd.oasis.opendocument.formula": ["odf"], "application/vnd.oasis.opendocument.formula-template": ["odft"], "application/vnd.oasis.opendocument.graphics": ["odg"], "application/vnd.oasis.opendocument.graphics-template": ["otg"], "application/vnd.oasis.opendocument.image": ["odi"], "application/vnd.oasis.opendocument.image-template": ["oti"], "application/vnd.oasis.opendocument.presentation": ["odp"], "application/vnd.oasis.opendocument.presentation-template": ["otp"], "application/vnd.oasis.opendocument.spreadsheet": ["ods"], "application/vnd.oasis.opendocument.spreadsheet-template": ["ots"], "application/vnd.oasis.opendocument.text": ["odt"], "application/vnd.oasis.opendocument.text-master": ["odm"], "application/vnd.oasis.opendocument.text-template": ["ott"], "application/vnd.oasis.opendocument.text-web": ["oth"], "application/vnd.olpc-sugar": ["xo"], "application/vnd.oma.dd2+xml": ["dd2"], "application/vnd.openblox.game+xml": ["obgx"], "application/vnd.openofficeorg.extension": ["oxt"], "application/vnd.openstreetmap.data+xml": ["osm"], "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"], "application/vnd.openxmlformats-officedocument.presentationml.slide": ["sldx"], "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ["ppsx"], "application/vnd.openxmlformats-officedocument.presentationml.template": ["potx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.template": ["xltx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ["dotx"], "application/vnd.osgeo.mapguide.package": ["mgp"], "application/vnd.osgi.dp": ["dp"], "application/vnd.osgi.subsystem": ["esa"], "application/vnd.palm": ["pdb", "pqa", "oprc"], "application/vnd.pawaafile": ["paw"], "application/vnd.pg.format": ["str"], "application/vnd.pg.osasli": ["ei6"], "application/vnd.picsel": ["efif"], "application/vnd.pmi.widget": ["wg"], "application/vnd.pocketlearn": ["plf"], "application/vnd.powerbuilder6": ["pbd"], "application/vnd.previewsystems.box": ["box"], "application/vnd.proteus.magazine": ["mgz"], "application/vnd.publishare-delta-tree": ["qps"], "application/vnd.pvi.ptid1": ["ptid"], "application/vnd.quark.quarkxpress": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"], "application/vnd.rar": ["rar"], "application/vnd.realvnc.bed": ["bed"], "application/vnd.recordare.musicxml": ["mxl"], "application/vnd.recordare.musicxml+xml": ["musicxml"], "application/vnd.rig.cryptonote": ["cryptonote"], "application/vnd.rim.cod": ["cod"], "application/vnd.rn-realmedia": ["rm"], "application/vnd.rn-realmedia-vbr": ["rmvb"], "application/vnd.route66.link66+xml": ["link66"], "application/vnd.sailingtracker.track": ["st"], "application/vnd.seemail": ["see"], "application/vnd.sema": ["sema"], "application/vnd.semd": ["semd"], "application/vnd.semf": ["semf"], "application/vnd.shana.informed.formdata": ["ifm"], "application/vnd.shana.informed.formtemplate": ["itp"], "application/vnd.shana.informed.interchange": ["iif"], "application/vnd.shana.informed.package": ["ipk"], "application/vnd.simtech-mindmapper": ["twd", "twds"], "application/vnd.smaf": ["mmf"], "application/vnd.smart.teacher": ["teacher"], "application/vnd.software602.filler.form+xml": ["fo"], "application/vnd.solent.sdkm+xml": ["sdkm", "sdkd"], "application/vnd.spotfire.dxp": ["dxp"], "application/vnd.spotfire.sfs": ["sfs"], "application/vnd.stardivision.calc": ["sdc"], "application/vnd.stardivision.draw": ["sda"], "application/vnd.stardivision.impress": ["sdd"], "application/vnd.stardivision.math": ["smf"], "application/vnd.stardivision.writer": ["sdw", "vor"], "application/vnd.stardivision.writer-global": ["sgl"], "application/vnd.stepmania.package": ["smzip"], "application/vnd.stepmania.stepchart": ["sm"], "application/vnd.sun.wadl+xml": ["wadl"], "application/vnd.sun.xml.calc": ["sxc"], "application/vnd.sun.xml.calc.template": ["stc"], "application/vnd.sun.xml.draw": ["sxd"], "application/vnd.sun.xml.draw.template": ["std"], "application/vnd.sun.xml.impress": ["sxi"], "application/vnd.sun.xml.impress.template": ["sti"], "application/vnd.sun.xml.math": ["sxm"], "application/vnd.sun.xml.writer": ["sxw"], "application/vnd.sun.xml.writer.global": ["sxg"], "application/vnd.sun.xml.writer.template": ["stw"], "application/vnd.sus-calendar": ["sus", "susp"], "application/vnd.svd": ["svd"], "application/vnd.symbian.install": ["sis", "sisx"], "application/vnd.syncml+xml": ["xsm"], "application/vnd.syncml.dm+wbxml": ["bdm"], "application/vnd.syncml.dm+xml": ["xdm"], "application/vnd.syncml.dmddf+xml": ["ddf"], "application/vnd.tao.intent-module-archive": ["tao"], "application/vnd.tcpdump.pcap": ["pcap", "cap", "dmp"], "application/vnd.tmobile-livetv": ["tmo"], "application/vnd.trid.tpt": ["tpt"], "application/vnd.triscape.mxs": ["mxs"], "application/vnd.trueapp": ["tra"], "application/vnd.ufdl": ["ufd", "ufdl"], "application/vnd.uiq.theme": ["utz"], "application/vnd.umajin": ["umj"], "application/vnd.unity": ["unityweb"], "application/vnd.uoml+xml": ["uoml"], "application/vnd.vcx": ["vcx"], "application/vnd.visio": ["vsd", "vst", "vss", "vsw"], "application/vnd.visionary": ["vis"], "application/vnd.vsf": ["vsf"], "application/vnd.wap.wbxml": ["wbxml"], "application/vnd.wap.wmlc": ["wmlc"], "application/vnd.wap.wmlscriptc": ["wmlsc"], "application/vnd.webturbo": ["wtb"], "application/vnd.wolfram.player": ["nbp"], "application/vnd.wordperfect": ["wpd"], "application/vnd.wqd": ["wqd"], "application/vnd.wt.stf": ["stf"], "application/vnd.xara": ["xar"], "application/vnd.xfdl": ["xfdl"], "application/vnd.yamaha.hv-dic": ["hvd"], "application/vnd.yamaha.hv-script": ["hvs"], "application/vnd.yamaha.hv-voice": ["hvp"], "application/vnd.yamaha.openscoreformat": ["osf"], "application/vnd.yamaha.openscoreformat.osfpvg+xml": ["osfpvg"], "application/vnd.yamaha.smaf-audio": ["saf"], "application/vnd.yamaha.smaf-phrase": ["spf"], "application/vnd.yellowriver-custom-menu": ["cmp"], "application/vnd.zul": ["zir", "zirz"], "application/vnd.zzazz.deck+xml": ["zaz"], "application/x-7z-compressed": ["7z"], "application/x-abiword": ["abw"], "application/x-ace-compressed": ["ace"], "application/x-apple-diskimage": ["*dmg"], "application/x-arj": ["arj"], "application/x-authorware-bin": ["aab", "x32", "u32", "vox"], "application/x-authorware-map": ["aam"], "application/x-authorware-seg": ["aas"], "application/x-bcpio": ["bcpio"], "application/x-bdoc": ["*bdoc"], "application/x-bittorrent": ["torrent"], "application/x-blorb": ["blb", "blorb"], "application/x-bzip": ["bz"], "application/x-bzip2": ["bz2", "boz"], "application/x-cbr": ["cbr", "cba", "cbt", "cbz", "cb7"], "application/x-cdlink": ["vcd"], "application/x-cfs-compressed": ["cfs"], "application/x-chat": ["chat"], "application/x-chess-pgn": ["pgn"], "application/x-chrome-extension": ["crx"], "application/x-cocoa": ["cco"], "application/x-conference": ["nsc"], "application/x-cpio": ["cpio"], "application/x-csh": ["csh"], "application/x-debian-package": ["*deb", "udeb"], "application/x-dgc-compressed": ["dgc"], "application/x-director": ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"], "application/x-doom": ["wad"], "application/x-dtbncx+xml": ["ncx"], "application/x-dtbook+xml": ["dtb"], "application/x-dtbresource+xml": ["res"], "application/x-dvi": ["dvi"], "application/x-envoy": ["evy"], "application/x-eva": ["eva"], "application/x-font-bdf": ["bdf"], "application/x-font-ghostscript": ["gsf"], "application/x-font-linux-psf": ["psf"], "application/x-font-pcf": ["pcf"], "application/x-font-snf": ["snf"], "application/x-font-type1": ["pfa", "pfb", "pfm", "afm"], "application/x-freearc": ["arc"], "application/x-futuresplash": ["spl"], "application/x-gca-compressed": ["gca"], "application/x-glulx": ["ulx"], "application/x-gnumeric": ["gnumeric"], "application/x-gramps-xml": ["gramps"], "application/x-gtar": ["gtar"], "application/x-hdf": ["hdf"], "application/x-httpd-php": ["php"], "application/x-install-instructions": ["install"], "application/x-iso9660-image": ["*iso"], "application/x-iwork-keynote-sffkey": ["*key"], "application/x-iwork-numbers-sffnumbers": ["*numbers"], "application/x-iwork-pages-sffpages": ["*pages"], "application/x-java-archive-diff": ["jardiff"], "application/x-java-jnlp-file": ["jnlp"], "application/x-keepass2": ["kdbx"], "application/x-latex": ["latex"], "application/x-lua-bytecode": ["luac"], "application/x-lzh-compressed": ["lzh", "lha"], "application/x-makeself": ["run"], "application/x-mie": ["mie"], "application/x-mobipocket-ebook": ["prc", "mobi"], "application/x-ms-application": ["application"], "application/x-ms-shortcut": ["lnk"], "application/x-ms-wmd": ["wmd"], "application/x-ms-wmz": ["wmz"], "application/x-ms-xbap": ["xbap"], "application/x-msaccess": ["mdb"], "application/x-msbinder": ["obd"], "application/x-mscardfile": ["crd"], "application/x-msclip": ["clp"], "application/x-msdos-program": ["*exe"], "application/x-msdownload": ["*exe", "*dll", "com", "bat", "*msi"], "application/x-msmediaview": ["mvb", "m13", "m14"], "application/x-msmetafile": ["*wmf", "*wmz", "*emf", "emz"], "application/x-msmoney": ["mny"], "application/x-mspublisher": ["pub"], "application/x-msschedule": ["scd"], "application/x-msterminal": ["trm"], "application/x-mswrite": ["wri"], "application/x-netcdf": ["nc", "cdf"], "application/x-ns-proxy-autoconfig": ["pac"], "application/x-nzb": ["nzb"], "application/x-perl": ["pl", "pm"], "application/x-pilot": ["*prc", "*pdb"], "application/x-pkcs12": ["p12", "pfx"], "application/x-pkcs7-certificates": ["p7b", "spc"], "application/x-pkcs7-certreqresp": ["p7r"], "application/x-rar-compressed": ["*rar"], "application/x-redhat-package-manager": ["rpm"], "application/x-research-info-systems": ["ris"], "application/x-sea": ["sea"], "application/x-sh": ["sh"], "application/x-shar": ["shar"], "application/x-shockwave-flash": ["swf"], "application/x-silverlight-app": ["xap"], "application/x-sql": ["sql"], "application/x-stuffit": ["sit"], "application/x-stuffitx": ["sitx"], "application/x-subrip": ["srt"], "application/x-sv4cpio": ["sv4cpio"], "application/x-sv4crc": ["sv4crc"], "application/x-t3vm-image": ["t3"], "application/x-tads": ["gam"], "application/x-tar": ["tar"], "application/x-tcl": ["tcl", "tk"], "application/x-tex": ["tex"], "application/x-tex-tfm": ["tfm"], "application/x-texinfo": ["texinfo", "texi"], "application/x-tgif": ["*obj"], "application/x-ustar": ["ustar"], "application/x-virtualbox-hdd": ["hdd"], "application/x-virtualbox-ova": ["ova"], "application/x-virtualbox-ovf": ["ovf"], "application/x-virtualbox-vbox": ["vbox"], "application/x-virtualbox-vbox-extpack": ["vbox-extpack"], "application/x-virtualbox-vdi": ["vdi"], "application/x-virtualbox-vhd": ["vhd"], "application/x-virtualbox-vmdk": ["vmdk"], "application/x-wais-source": ["src"], "application/x-web-app-manifest+json": ["webapp"], "application/x-x509-ca-cert": ["der", "crt", "pem"], "application/x-xfig": ["fig"], "application/x-xliff+xml": ["*xlf"], "application/x-xpinstall": ["xpi"], "application/x-xz": ["xz"], "application/x-zmachine": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"], "audio/vnd.dece.audio": ["uva", "uvva"], "audio/vnd.digital-winds": ["eol"], "audio/vnd.dra": ["dra"], "audio/vnd.dts": ["dts"], "audio/vnd.dts.hd": ["dtshd"], "audio/vnd.lucent.voice": ["lvp"], "audio/vnd.ms-playready.media.pya": ["pya"], "audio/vnd.nuera.ecelp4800": ["ecelp4800"], "audio/vnd.nuera.ecelp7470": ["ecelp7470"], "audio/vnd.nuera.ecelp9600": ["ecelp9600"], "audio/vnd.rip": ["rip"], "audio/x-aac": ["aac"], "audio/x-aiff": ["aif", "aiff", "aifc"], "audio/x-caf": ["caf"], "audio/x-flac": ["flac"], "audio/x-m4a": ["*m4a"], "audio/x-matroska": ["mka"], "audio/x-mpegurl": ["m3u"], "audio/x-ms-wax": ["wax"], "audio/x-ms-wma": ["wma"], "audio/x-pn-realaudio": ["ram", "ra"], "audio/x-pn-realaudio-plugin": ["rmp"], "audio/x-realaudio": ["*ra"], "audio/x-wav": ["*wav"], "chemical/x-cdx": ["cdx"], "chemical/x-cif": ["cif"], "chemical/x-cmdf": ["cmdf"], "chemical/x-cml": ["cml"], "chemical/x-csml": ["csml"], "chemical/x-xyz": ["xyz"], "image/prs.btif": ["btif"], "image/prs.pti": ["pti"], "image/vnd.adobe.photoshop": ["psd"], "image/vnd.airzip.accelerator.azv": ["azv"], "image/vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"], "image/vnd.djvu": ["djvu", "djv"], "image/vnd.dvb.subtitle": ["*sub"], "image/vnd.dwg": ["dwg"], "image/vnd.dxf": ["dxf"], "image/vnd.fastbidsheet": ["fbs"], "image/vnd.fpx": ["fpx"], "image/vnd.fst": ["fst"], "image/vnd.fujixerox.edmics-mmr": ["mmr"], "image/vnd.fujixerox.edmics-rlc": ["rlc"], "image/vnd.microsoft.icon": ["ico"], "image/vnd.ms-dds": ["dds"], "image/vnd.ms-modi": ["mdi"], "image/vnd.ms-photo": ["wdp"], "image/vnd.net-fpx": ["npx"], "image/vnd.pco.b16": ["b16"], "image/vnd.tencent.tap": ["tap"], "image/vnd.valve.source.texture": ["vtf"], "image/vnd.wap.wbmp": ["wbmp"], "image/vnd.xiff": ["xif"], "image/vnd.zbrush.pcx": ["pcx"], "image/x-3ds": ["3ds"], "image/x-cmu-raster": ["ras"], "image/x-cmx": ["cmx"], "image/x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"], "image/x-icon": ["*ico"], "image/x-jng": ["jng"], "image/x-mrsid-image": ["sid"], "image/x-ms-bmp": ["*bmp"], "image/x-pcx": ["*pcx"], "image/x-pict": ["pic", "pct"], "image/x-portable-anymap": ["pnm"], "image/x-portable-bitmap": ["pbm"], "image/x-portable-graymap": ["pgm"], "image/x-portable-pixmap": ["ppm"], "image/x-rgb": ["rgb"], "image/x-tga": ["tga"], "image/x-xbitmap": ["xbm"], "image/x-xpixmap": ["xpm"], "image/x-xwindowdump": ["xwd"], "message/vnd.wfa.wsc": ["wsc"], "model/vnd.collada+xml": ["dae"], "model/vnd.dwf": ["dwf"], "model/vnd.gdl": ["gdl"], "model/vnd.gtw": ["gtw"], "model/vnd.mts": ["mts"], "model/vnd.opengex": ["ogex"], "model/vnd.parasolid.transmit.binary": ["x_b"], "model/vnd.parasolid.transmit.text": ["x_t"], "model/vnd.sap.vds": ["vds"], "model/vnd.usdz+zip": ["usdz"], "model/vnd.valve.source.compiled-map": ["bsp"], "model/vnd.vtu": ["vtu"], "text/prs.lines.tag": ["dsc"], "text/vnd.curl": ["curl"], "text/vnd.curl.dcurl": ["dcurl"], "text/vnd.curl.mcurl": ["mcurl"], "text/vnd.curl.scurl": ["scurl"], "text/vnd.dvb.subtitle": ["sub"], "text/vnd.fly": ["fly"], "text/vnd.fmi.flexstor": ["flx"], "text/vnd.graphviz": ["gv"], "text/vnd.in3d.3dml": ["3dml"], "text/vnd.in3d.spot": ["spot"], "text/vnd.sun.j2me.app-descriptor": ["jad"], "text/vnd.wap.wml": ["wml"], "text/vnd.wap.wmlscript": ["wmls"], "text/x-asm": ["s", "asm"], "text/x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"], "text/x-component": ["htc"], "text/x-fortran": ["f", "for", "f77", "f90"], "text/x-handlebars-template": ["hbs"], "text/x-java-source": ["java"], "text/x-lua": ["lua"], "text/x-markdown": ["mkd"], "text/x-nfo": ["nfo"], "text/x-opml": ["opml"], "text/x-org": ["*org"], "text/x-pascal": ["p", "pas"], "text/x-processing": ["pde"], "text/x-sass": ["sass"], "text/x-scss": ["scss"], "text/x-setext": ["etx"], "text/x-sfv": ["sfv"], "text/x-suse-ymp": ["ymp"], "text/x-uuencode": ["uu"], "text/x-vcalendar": ["vcs"], "text/x-vcard": ["vcf"], "video/vnd.dece.hd": ["uvh", "uvvh"], "video/vnd.dece.mobile": ["uvm", "uvvm"], "video/vnd.dece.pd": ["uvp", "uvvp"], "video/vnd.dece.sd": ["uvs", "uvvs"], "video/vnd.dece.video": ["uvv", "uvvv"], "video/vnd.dvb.file": ["dvb"], "video/vnd.fvt": ["fvt"], "video/vnd.mpegurl": ["mxu", "m4u"], "video/vnd.ms-playready.media.pyv": ["pyv"], "video/vnd.uvvu.mp4": ["uvu", "uvvu"], "video/vnd.vivo": ["viv"], "video/x-f4v": ["f4v"], "video/x-fli": ["fli"], "video/x-flv": ["flv"], "video/x-m4v": ["m4v"], "video/x-matroska": ["mkv", "mk3d", "mks"], "video/x-mng": ["mng"], "video/x-ms-asf": ["asf", "asx"], "video/x-ms-vob": ["vob"], "video/x-ms-wm": ["wm"], "video/x-ms-wmv": ["wmv"], "video/x-ms-wmx": ["wmx"], "video/x-ms-wvx": ["wvx"], "video/x-msvideo": ["avi"], "video/x-sgi-movie": ["movie"], "video/x-smv": ["smv"], "x-conference/x-cooltalk": ["ice"] };
  }
});

// node_modules/@cloudflare/kv-asset-handler/node_modules/mime/index.js
var require_mime = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/node_modules/mime/index.js"(exports, module) {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    var Mime = require_Mime();
    module.exports = new Mime(require_standard(), require_other());
  }
});

// node_modules/@cloudflare/kv-asset-handler/dist/types.js
var require_types = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/dist/types.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InternalError = exports.NotFoundError = exports.MethodNotAllowedError = exports.KVError = void 0;
    var KVError = class extends Error {
      constructor(message, status = 500) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = KVError.name;
        this.status = status;
      }
      status;
    };
    __name(KVError, "KVError");
    exports.KVError = KVError;
    var MethodNotAllowedError = class extends KVError {
      constructor(message = `Not a valid request method`, status = 405) {
        super(message, status);
      }
    };
    __name(MethodNotAllowedError, "MethodNotAllowedError");
    exports.MethodNotAllowedError = MethodNotAllowedError;
    var NotFoundError = class extends KVError {
      constructor(message = `Not Found`, status = 404) {
        super(message, status);
      }
    };
    __name(NotFoundError, "NotFoundError");
    exports.NotFoundError = NotFoundError;
    var InternalError = class extends KVError {
      constructor(message = `Internal Error in KV Asset Handler`, status = 500) {
        super(message, status);
      }
    };
    __name(InternalError, "InternalError");
    exports.InternalError = InternalError;
  }
});

// node_modules/@cloudflare/kv-asset-handler/dist/index.js
var require_dist = __commonJS({
  "node_modules/@cloudflare/kv-asset-handler/dist/index.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o2, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o2, k2, desc);
    } : function(o2, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o2[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o2, v) {
      Object.defineProperty(o2, "default", { enumerable: true, value: v });
    } : function(o2, v) {
      o2["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InternalError = exports.NotFoundError = exports.MethodNotAllowedError = exports.serveSinglePageApp = exports.mapRequestToAsset = exports.getAssetFromKV = void 0;
    var mime = __importStar(require_mime());
    var types_1 = require_types();
    Object.defineProperty(exports, "InternalError", { enumerable: true, get: function() {
      return types_1.InternalError;
    } });
    Object.defineProperty(exports, "MethodNotAllowedError", { enumerable: true, get: function() {
      return types_1.MethodNotAllowedError;
    } });
    Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function() {
      return types_1.NotFoundError;
    } });
    var defaultCacheControl = {
      browserTTL: null,
      edgeTTL: 2 * 60 * 60 * 24,
      // 2 days
      bypassCache: false
      // do not bypass Cloudflare's cache
    };
    var parseStringAsObject = /* @__PURE__ */ __name((maybeString) => typeof maybeString === "string" ? JSON.parse(maybeString) : maybeString, "parseStringAsObject");
    var getAssetFromKVDefaultOptions = {
      ASSET_NAMESPACE: typeof __STATIC_CONTENT !== "undefined" ? __STATIC_CONTENT : void 0,
      ASSET_MANIFEST: typeof __STATIC_CONTENT_MANIFEST !== "undefined" ? parseStringAsObject(__STATIC_CONTENT_MANIFEST) : {},
      cacheControl: defaultCacheControl,
      defaultMimeType: "text/plain",
      defaultDocument: "index.html",
      pathIsEncoded: false,
      defaultETag: "strong"
    };
    function assignOptions(options) {
      return Object.assign({}, getAssetFromKVDefaultOptions, options);
    }
    __name(assignOptions, "assignOptions");
    var mapRequestToAsset = /* @__PURE__ */ __name((request, options) => {
      options = assignOptions(options);
      const parsedUrl = new URL(request.url);
      let pathname = parsedUrl.pathname;
      if (pathname.endsWith("/")) {
        pathname = pathname.concat(options.defaultDocument);
      } else if (!mime.getType(pathname)) {
        pathname = pathname.concat("/" + options.defaultDocument);
      }
      parsedUrl.pathname = pathname;
      return new Request(parsedUrl.toString(), request);
    }, "mapRequestToAsset");
    exports.mapRequestToAsset = mapRequestToAsset;
    function serveSinglePageApp(request, options) {
      options = assignOptions(options);
      request = mapRequestToAsset(request, options);
      const parsedUrl = new URL(request.url);
      if (parsedUrl.pathname.endsWith(".html")) {
        return new Request(`${parsedUrl.origin}/${options.defaultDocument}`, request);
      } else {
        return request;
      }
    }
    __name(serveSinglePageApp, "serveSinglePageApp");
    exports.serveSinglePageApp = serveSinglePageApp;
    var getAssetFromKV2 = /* @__PURE__ */ __name(async (event, options) => {
      options = assignOptions(options);
      const request = event.request;
      const ASSET_NAMESPACE = options.ASSET_NAMESPACE;
      const ASSET_MANIFEST = parseStringAsObject(options.ASSET_MANIFEST);
      if (typeof ASSET_NAMESPACE === "undefined") {
        throw new types_1.InternalError(`there is no KV namespace bound to the script`);
      }
      const rawPathKey = new URL(request.url).pathname.replace(/^\/+/, "");
      let pathIsEncoded = options.pathIsEncoded;
      let requestKey;
      if (options.mapRequestToAsset) {
        requestKey = options.mapRequestToAsset(request);
      } else if (ASSET_MANIFEST[rawPathKey]) {
        requestKey = request;
      } else if (ASSET_MANIFEST[decodeURIComponent(rawPathKey)]) {
        pathIsEncoded = true;
        requestKey = request;
      } else {
        const mappedRequest = mapRequestToAsset(request);
        const mappedRawPathKey = new URL(mappedRequest.url).pathname.replace(/^\/+/, "");
        if (ASSET_MANIFEST[decodeURIComponent(mappedRawPathKey)]) {
          pathIsEncoded = true;
          requestKey = mappedRequest;
        } else {
          requestKey = mapRequestToAsset(request, options);
        }
      }
      const SUPPORTED_METHODS = ["GET", "HEAD"];
      if (!SUPPORTED_METHODS.includes(requestKey.method)) {
        throw new types_1.MethodNotAllowedError(`${requestKey.method} is not a valid request method`);
      }
      const parsedUrl = new URL(requestKey.url);
      const pathname = pathIsEncoded ? decodeURIComponent(parsedUrl.pathname) : parsedUrl.pathname;
      let pathKey = pathname.replace(/^\/+/, "");
      const cache = caches.default;
      let mimeType = mime.getType(pathKey) || options.defaultMimeType;
      if (mimeType.startsWith("text") || mimeType === "application/javascript") {
        mimeType += "; charset=utf-8";
      }
      let shouldEdgeCache = false;
      if (typeof ASSET_MANIFEST !== "undefined") {
        if (ASSET_MANIFEST[pathKey]) {
          pathKey = ASSET_MANIFEST[pathKey];
          shouldEdgeCache = true;
        }
      }
      const cacheKey = new Request(`${parsedUrl.origin}/${pathKey}`, request);
      const evalCacheOpts = (() => {
        switch (typeof options.cacheControl) {
          case "function":
            return options.cacheControl(request);
          case "object":
            return options.cacheControl;
          default:
            return defaultCacheControl;
        }
      })();
      const formatETag = /* @__PURE__ */ __name((entityId = pathKey, validatorType = options.defaultETag) => {
        if (!entityId) {
          return "";
        }
        switch (validatorType) {
          case "weak":
            if (!entityId.startsWith("W/")) {
              if (entityId.startsWith(`"`) && entityId.endsWith(`"`)) {
                return `W/${entityId}`;
              }
              return `W/"${entityId}"`;
            }
            return entityId;
          case "strong":
            if (entityId.startsWith(`W/"`)) {
              entityId = entityId.replace("W/", "");
            }
            if (!entityId.endsWith(`"`)) {
              entityId = `"${entityId}"`;
            }
            return entityId;
          default:
            return "";
        }
      }, "formatETag");
      options.cacheControl = Object.assign({}, defaultCacheControl, evalCacheOpts);
      if (options.cacheControl.bypassCache || options.cacheControl.edgeTTL === null || request.method == "HEAD") {
        shouldEdgeCache = false;
      }
      const shouldSetBrowserCache = typeof options.cacheControl.browserTTL === "number";
      let response = null;
      if (shouldEdgeCache) {
        response = await cache.match(cacheKey);
      }
      if (response) {
        if (response.status > 300 && response.status < 400) {
          if (response.body && "cancel" in Object.getPrototypeOf(response.body)) {
            response.body.cancel();
          } else {
          }
          response = new Response(null, response);
        } else {
          const opts = {
            headers: new Headers(response.headers),
            status: 0,
            statusText: ""
          };
          opts.headers.set("cf-cache-status", "HIT");
          if (response.status) {
            opts.status = response.status;
            opts.statusText = response.statusText;
          } else if (opts.headers.has("Content-Range")) {
            opts.status = 206;
            opts.statusText = "Partial Content";
          } else {
            opts.status = 200;
            opts.statusText = "OK";
          }
          response = new Response(response.body, opts);
        }
      } else {
        const body = await ASSET_NAMESPACE.get(pathKey, "arrayBuffer");
        if (body === null) {
          throw new types_1.NotFoundError(`could not find ${pathKey} in your content namespace`);
        }
        response = new Response(body);
        if (shouldEdgeCache) {
          response.headers.set("Accept-Ranges", "bytes");
          response.headers.set("Content-Length", String(body.byteLength));
          if (!response.headers.has("etag")) {
            response.headers.set("etag", formatETag(pathKey));
          }
          response.headers.set("Cache-Control", `max-age=${options.cacheControl.edgeTTL}`);
          event.waitUntil(cache.put(cacheKey, response.clone()));
          response.headers.set("CF-Cache-Status", "MISS");
        }
      }
      response.headers.set("Content-Type", mimeType);
      if (response.status === 304) {
        const etag = formatETag(response.headers.get("etag"));
        const ifNoneMatch = cacheKey.headers.get("if-none-match");
        const proxyCacheStatus = response.headers.get("CF-Cache-Status");
        if (etag) {
          if (ifNoneMatch && ifNoneMatch === etag && proxyCacheStatus === "MISS") {
            response.headers.set("CF-Cache-Status", "EXPIRED");
          } else {
            response.headers.set("CF-Cache-Status", "REVALIDATED");
          }
          response.headers.set("etag", formatETag(etag, "weak"));
        }
      }
      if (shouldSetBrowserCache) {
        response.headers.set("Cache-Control", `max-age=${options.cacheControl.browserTTL}`);
      } else {
        response.headers.delete("Cache-Control");
      }
      return response;
    }, "getAssetFromKV");
    exports.getAssetFromKV = getAssetFromKV2;
  }
});

// .wrangler/tmp/bundle-vHSBir/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-vHSBir/middleware-insertion-facade.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var import_kv_asset_handler = __toESM(require_dist());

// node_modules/itty-router/index.mjs
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var e = /* @__PURE__ */ __name(({ base: e2 = "", routes: t = [], ...o2 } = {}) => ({ __proto__: new Proxy({}, { get: (o3, s2, r, n) => "handle" == s2 ? r.fetch : (o4, ...a) => t.push([s2.toUpperCase?.(), RegExp(`^${(n = (e2 + o4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), a, n]) && r }), routes: t, ...o2, async fetch(e3, ...o3) {
  let s2, r, n = new URL(e3.url), a = e3.query = { __proto__: null };
  for (let [e4, t2] of n.searchParams)
    a[e4] = a[e4] ? [].concat(a[e4], t2) : t2;
  for (let [a2, c2, i2, l2] of t)
    if ((a2 == e3.method || "ALL" == a2) && (r = n.pathname.match(c2))) {
      e3.params = r.groups || {}, e3.route = l2;
      for (let t2 of i2)
        if (null != (s2 = await t2(e3.proxy ?? e3, ...o3)))
          return s2;
    }
} }), "e");
var o = /* @__PURE__ */ __name((e2 = "text/plain; charset=utf-8", t) => (o2, { headers: s2 = {}, ...r } = {}) => void 0 === o2 || "Response" === o2?.constructor.name ? o2 : new Response(t ? t(o2) : o2, { headers: { "content-type": e2, ...s2.entries ? Object.fromEntries(s2) : s2 }, ...r }), "o");
var s = o("application/json; charset=utf-8", JSON.stringify);
var c = o("text/plain; charset=utf-8", String);
var i = o("text/html");
var l = o("image/jpeg");
var p = o("image/png");
var d = o("image/webp");

// worker.js
import manifest from "__STATIC_CONTENT_MANIFEST";
var assetManifest = JSON.parse(manifest);
var router = e();
var BASE_DEFAULT_SETTINGS = Object.freeze({
  siteName: "SimPage",
  siteLogo: "",
  greeting: "",
  footer: ""
});
var DEFAULT_STATS = Object.freeze({
  visitorCount: 0
});
var DEFAULT_WEATHER_CONFIG = Object.freeze({
  city: "\u5317\u4EAC"
});
var DEFAULT_ADMIN_PASSWORD = "admin123";
var SESSION_TTL_SECONDS = 12 * 60 * 60;
var AUTH_HEADER_PREFIX = "Bearer ";
router.post("/api/login", handleLogin);
router.get("/api/data", handleGetData);
router.get("/api/weather", handleGetWeather);
router.get("/api/admin/data", requireAuth, handleGetAdminData);
router.put("/api/admin/data", requireAuth, handleDataUpdate);
router.put("/api/data", requireAuth, handleDataUpdate);
router.post("/api/admin/password", requireAuth, handlePasswordUpdate);
router.get("/api/fetch-logo", requireAuth, handleFetchLogo);
router.get("/admin", (request, env, ctx) => serveStatic(request, env, ctx, "/admin.html"));
router.get("/admin/", (request, env, ctx) => serveStatic(request, env, ctx, "/admin.html"));
router.get("*", (request, env, ctx) => serveStatic(request, env, ctx));
router.all("*", () => new Response("Not Found", { status: 404 }));
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error("Unhandled error:", error);
      const errorResponse = {
        success: false,
        message: error.message,
        stack: error.stack
      };
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    }
  }
};
async function serveStatic(request, env, ctx, forcePath) {
  const url = new URL(request.url);
  if (forcePath) {
    url.pathname = forcePath;
    request = new Request(url.toString(), request);
  }
  try {
    if (url.pathname.startsWith("/data/")) {
      const key = url.pathname.substring(1);
      const object = await env.__STATIC_CONTENT.get(key, { type: "arrayBuffer" });
      if (object === null) {
        return new Response("Not found", { status: 404 });
      }
      const headers = {
        "content-type": "application/json;charset=UTF-8",
        "cache-control": "public, max-age=3600"
        // Cache for 1 hour
      };
      return new Response(object, { headers });
    }
    const asset = await (0, import_kv_asset_handler.getAssetFromKV)(
      {
        request,
        waitUntil: (promise) => ctx.waitUntil(promise)
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest
      }
    );
    return asset;
  } catch (e2) {
    const isHTMLRequest = (request.headers.get("accept") || "").includes("text/html");
    const isRoot = new URL(request.url).pathname === "/";
    if (isHTMLRequest || isRoot) {
      try {
        const notFoundRequest = new Request(new URL("/index.html", request.url), request);
        return await (0, import_kv_asset_handler.getAssetFromKV)(
          {
            request: notFoundRequest,
            waitUntil: (promise) => ctx.waitUntil(promise)
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: assetManifest
          }
        );
      } catch (e22) {
        return new Response("Not Found", { status: 404 });
      }
    }
    return new Response("Not Found", { status: 404 });
  }
}
__name(serveStatic, "serveStatic");
async function handleLogin(request, env) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return jsonResponse({ success: false, message: "\u8BF7\u8F93\u5165\u5BC6\u7801\u3002" }, 400);
  }
  const fullData = await readFullData(env);
  const admin = fullData.admin;
  if (!admin || !admin.passwordSalt || !admin.passwordHash) {
    return jsonResponse({ success: false, message: "\u767B\u5F55\u529F\u80FD\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002" }, 500);
  }
  const isMatch = await verifyPassword(password, admin.passwordSalt, admin.passwordHash);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "\u5BC6\u7801\u9519\u8BEF\u3002" }, 401);
  }
  const token = generateToken();
  await env.SESSIONS.put(token, "active", { expirationTtl: SESSION_TTL_SECONDS });
  return jsonResponse({ success: true, token });
}
__name(handleLogin, "handleLogin");
async function handleGetData(request, env) {
  try {
    const data = await incrementVisitorCountAndReadData(env);
    return jsonResponse(data);
  } catch (error) {
    console.error("Error in handleGetData:", error);
    return jsonResponse(
      {
        success: false,
        message: `Error fetching data: ${error.message}`,
        stack: error.stack
      },
      500
    );
  }
}
__name(handleGetData, "handleGetData");
async function handleGetWeather(request, env, ctx) {
  try {
    const fullData = await readFullData(env);
    const weatherSettings = normaliseWeatherSettingsValue(fullData.settings?.weather);
    let cities = weatherSettings.city;
    if (!Array.isArray(cities) || cities.length === 0) {
      cities = [DEFAULT_WEATHER_CONFIG.city];
    }
    const weatherPromises = cities.map(
      (city) => fetchOpenMeteoWeather(city, env, ctx).then((weather) => ({ ...weather, city, success: true })).catch((error) => {
        console.error(`\u83B7\u53D6\u57CE\u5E02 ${city} \u7684\u5929\u6C14\u4FE1\u606F\u5931\u8D25\uFF1A`, error);
        return { city, success: false, message: error.message };
      })
    );
    const results = await Promise.all(weatherPromises);
    const successfulWeatherData = results.filter((r) => r.success);
    if (successfulWeatherData.length === 0 && results.length > 0) {
      const firstError = results.find((r) => !r.success);
      const errorMessage = firstError?.message || "\u65E0\u6CD5\u83B7\u53D6\u4EFB\u4F55\u57CE\u5E02\u7684\u5929\u6C14\u4FE1\u606F\u3002";
      return jsonResponse({ success: false, message: errorMessage }, 502);
    }
    return jsonResponse({ success: true, data: successfulWeatherData });
  } catch (error) {
    const statusCode = error.statusCode || 502;
    return jsonResponse({ success: false, message: error.message }, statusCode);
  }
}
__name(handleGetWeather, "handleGetWeather");
async function handleGetAdminData(request, env) {
  const fullData = await readFullData(env);
  const data = sanitiseData(fullData);
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const cityString = Array.isArray(weather.city) ? weather.city.join(" ") : weather.city;
  data.settings.weather = { city: cityString };
  return jsonResponse({ success: true, data });
}
__name(handleGetAdminData, "handleGetAdminData");
async function handleDataUpdate(request, env) {
  try {
    const { apps, bookmarks, settings } = await request.json();
    const normalisedApps = normaliseCollection(apps, { label: "\u5E94\u7528", type: "apps" });
    const normalisedBookmarks = normaliseCollection(bookmarks, { label: "\u4E66\u7B7E", type: "bookmarks" });
    const normalisedSettings = normaliseSettingsInput(settings);
    const existing = await readFullData(env);
    const payload = {
      settings: normalisedSettings,
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
      stats: existing.stats,
      admin: existing.admin
    };
    await writeFullData(env, payload);
    return jsonResponse({ success: true, data: sanitiseData(payload) });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 400);
  }
}
__name(handleDataUpdate, "handleDataUpdate");
async function handlePasswordUpdate(request, env) {
  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPasswordRaw = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword) {
    return jsonResponse({ success: false, message: "\u8BF7\u8F93\u5165\u5F53\u524D\u5BC6\u7801\u3002" }, 400);
  }
  const cleanNewPassword = newPasswordRaw.trim();
  if (!cleanNewPassword || cleanNewPassword.length < 6) {
    return jsonResponse({ success: false, message: "\u65B0\u5BC6\u7801\u957F\u5EA6\u81F3\u5C11\u4E3A 6 \u4F4D\u3002" }, 400);
  }
  const fullData = await readFullData(env);
  const admin = fullData.admin;
  if (!admin || !admin.passwordHash || !admin.passwordSalt) {
    return jsonResponse({ success: false, message: "\u5BC6\u7801\u4FEE\u6539\u529F\u80FD\u6682\u4E0D\u53EF\u7528\u3002" }, 500);
  }
  const isMatch = await verifyPassword(currentPassword, admin.passwordSalt, admin.passwordHash);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E\u3002" }, 401);
  }
  const isSameAsOld = await verifyPassword(cleanNewPassword, admin.passwordSalt, admin.passwordHash);
  if (isSameAsOld) {
    return jsonResponse({ success: false, message: "\u65B0\u5BC6\u7801\u4E0D\u80FD\u4E0E\u5F53\u524D\u5BC6\u7801\u76F8\u540C\u3002" }, 400);
  }
  const { passwordHash, passwordSalt } = await hashPassword(cleanNewPassword);
  const updatedData = {
    ...fullData,
    admin: { passwordHash, passwordSalt }
  };
  await writeFullData(env, updatedData);
  return jsonResponse({ success: true, message: "\u5BC6\u7801\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u767B\u5F55\u8BF7\u4F7F\u7528\u65B0\u5BC6\u7801\u3002" });
}
__name(handlePasswordUpdate, "handlePasswordUpdate");
function handleFetchLogo(request, env) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("targetUrl");
    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
      return jsonResponse({ success: false, message: "\u7F3A\u5C11\u6709\u6548\u7684 targetUrl \u53C2\u6570" }, 400);
    }
    let domain = targetUrl.trim().replace(/^(https?:\/\/)?/, "");
    domain = domain.split("/")[0];
    if (!domain) {
      return jsonResponse({ success: false, message: "\u65E0\u6CD5\u4ECE\u94FE\u63A5\u4E2D\u63D0\u53D6\u57DF\u540D\u3002" }, 400);
    }
    const logoUrl = `https://icon.ooo/${domain}`;
    return jsonResponse({ success: true, logoUrl });
  } catch (error) {
    console.error("\u751F\u6210 Logo \u94FE\u63A5\u65F6\u53D1\u751F\u5185\u90E8\u9519\u8BEF:", error);
    return jsonResponse({ success: false, message: "\u751F\u6210 Logo \u94FE\u63A5\u5931\u8D25" }, 500);
  }
}
__name(handleFetchLogo, "handleFetchLogo");
async function requireAuth(request, env) {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith(AUTH_HEADER_PREFIX)) {
    return jsonResponse({ success: false, message: "\u8BF7\u767B\u5F55\u540E\u518D\u6267\u884C\u6B64\u64CD\u4F5C\u3002" }, 401);
  }
  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return jsonResponse({ success: false, message: "\u8BF7\u767B\u5F55\u540E\u518D\u6267\u884C\u6B64\u64CD\u4F5C\u3002" }, 401);
  }
  const session = await env.SESSIONS.get(token);
  if (!session) {
    return jsonResponse({ success: false, message: "\u767B\u5F55\u72B6\u6001\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002" }, 401);
  }
}
__name(requireAuth, "requireAuth");
var DATA_KEY = "data";
async function readFullData(env) {
  const raw = await env.SIMPAGE_DATA.get(DATA_KEY);
  if (!raw) {
    const defaultData = await createDefaultData();
    await writeFullData(env, defaultData);
    return defaultData;
  }
  const parsed = JSON.parse(raw);
  return parsed;
}
__name(readFullData, "readFullData");
async function writeFullData(env, fullData) {
  await env.SIMPAGE_DATA.put(DATA_KEY, JSON.stringify(fullData, null, 2));
}
__name(writeFullData, "writeFullData");
async function incrementVisitorCountAndReadData(env) {
  const fullData = await readFullData(env);
  const sanitised = sanitiseData(fullData);
  const currentCount = fullData.stats?.visitorCount || 0;
  const nextVisitorCount = currentCount + 1;
  sanitised.visitorCount = nextVisitorCount;
  const updatedData = {
    ...fullData,
    stats: { ...fullData.stats, visitorCount: nextVisitorCount }
  };
  const promise = writeFullData(env, updatedData);
  if (globalThis.ctx && typeof globalThis.ctx.waitUntil === "function") {
    globalThis.ctx.waitUntil(promise);
  }
  return sanitised;
}
__name(incrementVisitorCountAndReadData, "incrementVisitorCountAndReadData");
function sanitiseData(fullData) {
  const defaults = createDefaultSettings();
  const sourceSettings = fullData.settings || defaults;
  const weather = normaliseWeatherSettingsValue(sourceSettings.weather);
  return {
    settings: {
      siteName: sourceSettings.siteName || defaults.siteName,
      siteLogo: sourceSettings.siteLogo || defaults.siteLogo,
      greeting: sourceSettings.greeting || defaults.greeting,
      footer: normaliseFooterValue(sourceSettings.footer),
      weather: { city: weather.city }
    },
    apps: fullData.apps?.map((item) => ({ ...item })) || [],
    bookmarks: fullData.bookmarks?.map((item) => ({ ...item })) || [],
    visitorCount: fullData.stats?.visitorCount || DEFAULT_STATS.visitorCount,
    config: {
      weather: {
        defaultCity: DEFAULT_WEATHER_CONFIG.city
      }
    }
  };
}
__name(sanitiseData, "sanitiseData");
function normaliseSettingsInput(input) {
  const siteName = typeof input?.siteName === "string" ? input.siteName.trim() : "";
  if (!siteName)
    throw new Error("\u7F51\u7AD9\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u3002");
  return {
    siteName,
    siteLogo: typeof input?.siteLogo === "string" ? input.siteLogo.trim() : "",
    greeting: typeof input?.greeting === "string" ? input.greeting.trim() : "",
    footer: normaliseFooterValue(input?.footer),
    weather: normaliseWeatherSettingsInput(input?.weather)
  };
}
__name(normaliseSettingsInput, "normaliseSettingsInput");
function normaliseCollection(value, { label, type }) {
  if (!Array.isArray(value))
    throw new Error(`${label} \u6570\u636E\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u5E94\u4E3A\u6570\u7EC4\u3002`);
  const seen = /* @__PURE__ */ new Set();
  return value.map((item) => {
    const normalised = normaliseItem(item, type);
    if (seen.has(normalised.id)) {
      normalised.id = crypto.randomUUID();
    }
    seen.add(normalised.id);
    return normalised;
  });
}
__name(normaliseCollection, "normaliseCollection");
function normaliseItem(input, type) {
  if (!input || typeof input !== "object")
    throw new Error("\u6570\u636E\u9879\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
  const name = String(input.name || "").trim();
  const url = String(input.url || "").trim();
  if (!name)
    throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u3002");
  if (!url)
    throw new Error("\u94FE\u63A5\u4E0D\u80FD\u4E3A\u7A7A\u3002");
  const payload = {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : crypto.randomUUID(),
    name,
    url: ensureUrlProtocol(url),
    description: typeof input.description === "string" ? input.description.trim() : "",
    icon: typeof input.icon === "string" ? input.icon.trim() : ""
  };
  if (type === "bookmarks") {
    payload.category = typeof input.category === "string" ? input.category.trim() : "";
  }
  return payload;
}
__name(normaliseItem, "normaliseItem");
function normaliseFooterValue(value) {
  if (typeof value !== "string")
    return "";
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}
__name(normaliseFooterValue, "normaliseFooterValue");
function normaliseWeatherSettingsValue(input) {
  const fallback = createDefaultWeatherSettings();
  let value = { ...fallback };
  if (input && typeof input === "object") {
    if (typeof input.city === "string" && input.city.trim()) {
      value.city = input.city.trim().split(/\s+/).filter(Boolean);
    } else if (Array.isArray(input.city)) {
      value.city = input.city.map((c2) => String(c2).trim()).filter(Boolean);
    }
  }
  if (!value.city || value.city.length === 0) {
    value.city = fallback.city;
  }
  return value;
}
__name(normaliseWeatherSettingsValue, "normaliseWeatherSettingsValue");
function normaliseWeatherSettingsInput(rawWeather) {
  if (!rawWeather || typeof rawWeather !== "object") {
    return createDefaultWeatherSettings();
  }
  const citySource = rawWeather.city;
  let cities = [];
  if (typeof citySource === "string") {
    cities = citySource.split(/\s+/).filter(Boolean);
  } else if (Array.isArray(citySource)) {
    cities = citySource.map((c2) => String(c2).trim()).filter(Boolean);
  }
  if (cities.length === 0) {
    throw new Error("\u5929\u6C14\u57CE\u5E02\u4E0D\u80FD\u4E3A\u7A7A\u3002");
  }
  return { city: cities };
}
__name(normaliseWeatherSettingsInput, "normaliseWeatherSettingsInput");
function createDefaultSettings() {
  return {
    ...BASE_DEFAULT_SETTINGS,
    weather: createDefaultWeatherSettings()
  };
}
__name(createDefaultSettings, "createDefaultSettings");
function createDefaultWeatherSettings() {
  return { city: [DEFAULT_WEATHER_CONFIG.city] };
}
__name(createDefaultWeatherSettings, "createDefaultWeatherSettings");
async function createDefaultData() {
  const admin = await createDefaultAdminCredentials();
  return {
    "settings": {
      "siteName": "SimPage",
      "siteLogo": "",
      "greeting": "",
      "footer": "\u6B22\u8FCE\u6765\u5230\u6211\u7684\u4E3B\u9875",
      "weather": {
        "city": ["\u5317\u4EAC", "\u4E0A\u6D77"]
      }
    },
    "apps": [
      { "id": "app-figma", "name": "Figma", "url": "https://www.figma.com/", "description": "\u534F\u4F5C\u5F0F\u754C\u9762\u8BBE\u8BA1\u5DE5\u5177\u3002", "icon": "\u{1F3A8}" },
      { "id": "app-notion", "name": "Notion", "url": "https://www.notion.so/", "description": "\u591A\u5408\u4E00\u7684\u7B14\u8BB0\u4E0E\u77E5\u8BC6\u7BA1\u7406\u5E73\u53F0\u3002", "icon": "\u{1F5C2}\uFE0F" },
      { "id": "app-slack", "name": "Slack", "url": "https://slack.com/", "description": "\u56E2\u961F\u5373\u65F6\u6C9F\u901A\u4E0E\u534F\u4F5C\u4E2D\u5FC3\u3002", "icon": "\u{1F4AC}" },
      { "id": "app-github", "name": "GitHub", "url": "https://github.com/", "description": "\u4EE3\u7801\u6258\u7BA1\u4E0E\u534F\u4F5C\u5E73\u53F0\u3002", "icon": "\u{1F419}" },
      { "id": "app-canva", "name": "Canva", "url": "https://www.canva.com/", "description": "\u7B80\u5355\u6613\u7528\u7684\u5728\u7EBF\u8BBE\u8BA1\u5DE5\u5177\u3002", "icon": "\u{1F58C}\uFE0F" }
    ],
    "bookmarks": [
      { "id": "bookmark-oschina", "name": "\u5F00\u6E90\u4E2D\u56FD", "url": "https://www.oschina.net/", "description": "\u805A\u7126\u5F00\u6E90\u4FE1\u606F\u4E0E\u6280\u672F\u793E\u533A\u3002", "icon": "\u{1F310}", "category": "\u6280\u672F\u793E\u533A" },
      { "id": "bookmark-sspai", "name": "\u5C11\u6570\u6D3E", "url": "https://sspai.com/", "description": "\u5173\u6CE8\u6548\u7387\u5DE5\u5177\u4E0E\u751F\u6D3B\u65B9\u5F0F\u7684\u5A92\u4F53\u3002", "icon": "\u{1F4F0}", "category": "\u6548\u7387\u4E0E\u751F\u6D3B" },
      { "id": "bookmark-zhihu", "name": "\u77E5\u4E4E", "url": "https://www.zhihu.com/", "description": "\u95EE\u7B54\u4E0E\u77E5\u8BC6\u5206\u4EAB\u793E\u533A\u3002", "icon": "\u2753", "category": "\u77E5\u8BC6\u5B66\u4E60" },
      { "id": "bookmark-jike", "name": "\u5373\u523B", "url": "https://m.okjike.com/", "description": "\u5174\u8DA3\u793E\u4EA4\u4E0E\u8D44\u8BAF\u805A\u5408\u5E73\u53F0\u3002", "icon": "\u{1F4EE}", "category": "\u8D44\u8BAF\u805A\u5408" },
      { "id": "bookmark-juejin", "name": "\u7A00\u571F\u6398\u91D1", "url": "https://juejin.cn/", "description": "\u5F00\u53D1\u8005\u6280\u672F\u793E\u533A\u4E0E\u4F18\u8D28\u5185\u5BB9\u3002", "icon": "\u{1F4A1}", "category": "\u6280\u672F\u793E\u533A" }
    ],
    "stats": {
      "visitorCount": 0
    },
    "admin": admin
  };
}
__name(createDefaultData, "createDefaultData");
function generateToken() {
  return crypto.randomUUID();
}
__name(generateToken, "generateToken");
function ensureUrlProtocol(url) {
  if (/^https?:\/\//i.test(url))
    return url;
  return `https://${url}`;
}
__name(ensureUrlProtocol, "ensureUrlProtocol");
async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bufferToHex(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    512
    // 64 bytes
  );
  const hashHex = bufferToHex(new Uint8Array(derivedBits));
  return { passwordHash: hashHex, passwordSalt: saltHex };
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, saltHex, expectedHashHex) {
  const salt = hexToBuffer(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    512
  );
  const actualHashHex = bufferToHex(new Uint8Array(derivedBits));
  return timingSafeEqual(expectedHashHex, actualHashHex);
}
__name(verifyPassword, "verifyPassword");
async function createDefaultAdminCredentials() {
  return await hashPassword(DEFAULT_ADMIN_PASSWORD);
}
__name(createDefaultAdminCredentials, "createDefaultAdminCredentials");
var WEATHER_API_TIMEOUT_MS = 5e3;
var GEOLOCATION_MAX_RETRIES = 3;
var GEOLOCATION_RETRY_DELAY_BASE_MS = 300;
async function fetchAndCache(url, ctx) {
  const cache = caches.default;
  let response = await cache.match(url);
  if (!response) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_API_TIMEOUT_MS);
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "identity",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const cacheableResponse = response.clone();
      if (response.ok) {
        const newHeaders = new Headers(cacheableResponse.headers);
        newHeaders.set("Cache-Control", "public, max-age=900");
        const cacheResponseForStorage = new Response(cacheableResponse.body, {
          status: cacheableResponse.status,
          statusText: cacheableResponse.statusText,
          headers: newHeaders
        });
        ctx.waitUntil(cache.put(url, cacheResponseForStorage));
      } else {
        const newHeaders = new Headers(cacheableResponse.headers);
        newHeaders.set("Cache-Control", "public, max-age=60");
        const failedResponseForStorage = new Response(cacheableResponse.body, {
          status: cacheableResponse.status,
          statusText: cacheableResponse.statusText,
          headers: newHeaders
        });
        ctx.waitUntil(cache.put(url, failedResponseForStorage));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  if (!response.ok) {
    throw createWeatherError(`API\u8BF7\u6C42\u5931\u8D25: ${response.status}`, response.status);
  }
  return response.json();
}
__name(fetchAndCache, "fetchAndCache");
async function geocodeCity(cityName, env, ctx) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", cityName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");
  let lastError = null;
  for (let attempt = 0; attempt < GEOLOCATION_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = GEOLOCATION_RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const payload = await fetchAndCache(url, ctx);
      if (!payload?.results?.[0]) {
        throw createWeatherError(`\u672A\u627E\u5230\u57CE\u5E02"${cityName}"\u7684\u5730\u7406\u4F4D\u7F6E\u4FE1\u606F\u3002`, 404);
      }
      const { latitude, longitude, name } = payload.results[0];
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw createWeatherError("\u5730\u7406\u4F4D\u7F6E\u4FE1\u606F\u65E0\u6548\u3002");
      }
      return { latitude, longitude, name: name || cityName };
    } catch (error) {
      lastError = error;
      if (error?.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      console.warn(
        `geocodeCity failed (attempt ${attempt + 1}/${GEOLOCATION_MAX_RETRIES}), retrying...`,
        error.message
      );
    }
  }
  throw lastError || createWeatherError("\u5730\u7406\u7F16\u7801\u670D\u52A1\u83B7\u53D6\u5931\u8D25\uFF0C\u4E14\u6240\u6709\u91CD\u8BD5\u5747\u544A\u5931\u8D25\u3002", 502);
}
__name(geocodeCity, "geocodeCity");
async function fetchOpenMeteoWeather(cityName, env, ctx) {
  const location = await geocodeCity(cityName, env, ctx);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");
  const payload = await fetchAndCache(url, ctx);
  const current = payload?.current_weather;
  if (!current || typeof current !== "object") {
    throw createWeatherError("\u5929\u6C14\u6570\u636E\u683C\u5F0F\u5F02\u5E38\u3002");
  }
  return {
    text: getWeatherDescription(Number(current.weathercode)),
    temperature: Number(current.temperature),
    windspeed: Number(current.windspeed),
    weathercode: Number(current.weathercode),
    time: current.time || null
  };
}
__name(fetchOpenMeteoWeather, "fetchOpenMeteoWeather");
function createWeatherError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
__name(createWeatherError, "createWeatherError");
function getWeatherDescription(code) {
  const map = {
    0: "\u6674\u5929",
    1: "\u6674\u6717",
    2: "\u591A\u4E91",
    3: "\u9634\u5929",
    45: "\u96FE",
    48: "\u51BB\u96FE",
    51: "\u5C0F\u96E8",
    53: "\u4E2D\u96E8",
    55: "\u5927\u96E8",
    56: "\u5C0F\u51BB\u96E8",
    57: "\u51BB\u96E8",
    61: "\u5C0F\u96E8",
    63: "\u4E2D\u96E8",
    65: "\u5927\u96E8",
    66: "\u5C0F\u51BB\u96E8",
    67: "\u51BB\u96E8",
    71: "\u5C0F\u96EA",
    73: "\u4E2D\u96EA",
    75: "\u5927\u96EA",
    77: "\u96EA\u7C92",
    80: "\u9635\u96E8",
    81: "\u4E2D\u9635\u96E8",
    82: "\u5927\u9635\u96E8",
    85: "\u5C0F\u9635\u96EA",
    86: "\u5927\u9635\u96EA",
    95: "\u96F7\u96E8",
    96: "\u96F7\u96E8\u4F34\u51B0\u96F9",
    99: "\u96F7\u96E8\u4F34\u5927\u51B0\u96F9"
  };
  return map[code] || "\u672A\u77E5";
}
__name(getWeatherDescription, "getWeatherDescription");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8" }
  });
}
__name(jsonResponse, "jsonResponse");
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(bufferToHex, "bufferToHex");
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i2 = 0; i2 < hex.length; i2 += 2) {
    bytes[i2 / 2] = parseInt(hex.substring(i2, i2 + 2), 16);
  }
  return bytes.buffer;
}
__name(hexToBuffer, "hexToBuffer");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i2 = 0; i2 < a.length; i2++) {
    diff |= a.charCodeAt(i2) ^ b.charCodeAt(i2);
  }
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e2) {
      console.error("Failed to drain the unused request body.", e2);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function reduceError(e2) {
  return {
    name: e2?.name,
    message: e2?.message ?? String(e2),
    stack: e2?.stack,
    cause: e2?.cause === void 0 ? void 0 : reduceError(e2.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e2) {
    const error = reduceError(e2);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-vHSBir/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-vHSBir/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
