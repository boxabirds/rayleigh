{
  description = "Rayleigh development environment";
  
  deps = {
    pkgs = import <nixpkgs> {};
  };
  
  env = {
    LANG = "en_US.UTF-8";
    NODE_VERSION = "22.5.1";
  };
  
  packages = with pkgs; [
    nodejs-22_x
    nodePackages.typescript
    nodePackages.typescript-language-server
  ];
}
